# Writing REST API with Go and PostgreSQL

## Introduction

This tutorial demonstrates how to use treemux and go-pg to write basic REST APIs. For a more
realistic example, please see
[treemux + go-pg realworld example application](https://github.com/uptrace/go-treemux-realworld-example-app).

## treemux

[treemux](https://github.com/vmihailenco/treemux) is a fast and flexible HTTP router. Using it the
following classic HTTP handler:

```go
func myHandler(w http.ResponseWriter, req *http.Request) {
    user, err := selectUser(req.Context())
    if err != nil {
        writeError(w, err)
        return
    }

    err = writeResult(w, map[string]interface{}{
        "user": user
    })
    if err != nil {
        writeError(w, err)
        return
    }
}
```

can be written as:

```go
func myHandler(w http.ResponseWriter, req treemux.Request) error {
    user, err := selectUser(req.Context(), req.Param("user_id"))
    if err != nil {
        return err
    }

    return treemux.JSON(w, treemux.H{
        "user": user,
    })
}
```

To customize error handling, use treemux's middleware:

```go
import "github.com/vmihailenco/treemux"

mux := treemux.New(
    treemux.WithMiddleware(errorHandler),
)

func errorHandler(next treemux.HandlerFunc) treemux.HandlerFunc {
    return func(w http.ResponseWriter, req treemux.Request) error {
        err := next(w, req)
        if err == nil {
            return nil
        }


        if err == pg.ErrNoRows {
            w.WriteHeader(http.StatusNotFound)
        } else {
            w.WriteHeader(http.StatusBadRequest)
        }

        _ = treemux.JSON(w, treemux.H{
            "message": err.Error(),
        })

        return err
    }
}
```

## Code structure

I recommend to keep HTTP handlers and DB models in the same package. But split the code into
logically isolated Go packages. Each package should have `init.go` file with some initialization
logic.

```
cmd/
    api/
        api.go
org/
    init.go
    user.go
    user_api.go
    project.go
    project_api.go
blog/
    init.go
    article.go
    article_api.go
billing/
    init.go
    receipt.go
    receipt_api.go
global/ # global package that initializes the app
    pg.go
    treemux.go
```

## Router

This tutorial defines 3 HTTP handlers using treemux router:

```go
var Router = treemux.New()

func init() {
    g := Router.NewGroup("/api")

    g.POST("/users", createUserHandler)
    g.GET("/users/:user_id", showUserHandler)
    g.GET("/users", filterUsersHandler)
}
```

## Parsing JSON

- Don't forget to limit max request size.
- To ease debugging typos in JSON, use `Decoder.DisallowUnknownFields`.

```go
req.Body = http.MaxBytesReader(w, req.Body, 100 << 10) // 100KiB

dec := json.NewDecoder(req.Body)
dec.DisallowUnknownFields()

if err := dec.Decode(&value); err != nil {
    return err
}
```

## Creating a user

The model:

```go
type User struct {
    tableName struct{} `pg:",alias:u"`

    ID   int64  `json:"id"`
    Name string `json:"name"`
}
```

The handler:

```go
func createUserHandler(w http.ResponseWriter, req treemux.Request) error {
    // Define struct in-place to not clutter the package namespace.
    var in struct {
        User *User `json:"user"`
    }

    dec := json.NewDecoder(req.Body)
    if err := dec.Decode(in); err != nil {
        return err
    }

    user := in.User
    if user == nil {
        // Return an error and let treemux's ErrorHandler do the rest.
        return errors.New(`JSON field "user" is required`)
    }

    // This code is small and simple - keep it as is.
    // For more complex queries extract this to a helper function.
    if _, err := global.PG().Model(user).Insert(); err != nil {
        return err
    }

    return treemux.JSON(w, treemux.H{
        "user": user,
    })
}

// Not needed in simple cases like this.
func insertUser(ctx context.Context, user *User) error {
    _, err := global.PG().Model(user).Insert()
    return err
}
```

## Displaying a user

```go
func showUserHandler(w http.ResponseWriter, req treemux.Request) error {
    // Parse route param as int64.
    userID, err := req.Params.Int64("user_id")
    if err != nil {
        return err
    }

    user := new(User)
    // Keep it simple!
    err := global.PG().Model(user).Where("id = ?", userID).Select()
    if err != nil {
        return err
    }

    return treemux.JSON(w, treemux.H{
        "user": user,
    })
}
```

## Filtering users

For complex filters I recommend creating a helper struct and storing all filters there. This way you
can check filters state at any stage of request processing.

The following example uses [urlstruct](github.com/go-pg/urlstruct) package to decode `url.Values`
into a struct:

```go
import "github.com/go-pg/urlstruct"

type UserFilter struct {
    urlstruct.Pager

    ID       int64
    NameLike string
}

func decodeUserFilter(req treemux.Request) (*UserFilter, error) {
    query := req.URL.Query()

    f := &UserFilter{
        ID:       req.Params.Int64("user_id")
        NameLike: query.Get("name"),
    }

    // Manually unmarshal pager values.
    if err := f.Pager.UnmarshalValues(req.Context(), query); err != nil {
        return nil, err
    }

    return f, nil
}
```

The handler:

```go
func filterUsersHandler(w http.ResponseWriter, req treemux.Request) error {
    f, err := decodeUserFilter(req)
    if err != nil {
        return err
    }

    users := make([]*User, 0)

    q := global.PG().Model(&users).
        Limit(f.Pager.GetLimit()).
        Offset(f.Pager.GetOffset())

    if f.ID != 0 {
        q = q.Where("id = ?", userID)
    }

    if f.NameLike != "" {
        q = q.Where("name LIKE ?", f.NameLike)
    }

    if err := q.Select(); err != nil {
        return err
    }

    return treemux.JSON(w, treemux.H{
        "users": users,
    })
}
```
