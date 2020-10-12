---
template: main.html
---

# Getting started

<!-- prettier-ignore -->
!!! note
    If you are already familiar with go-pg, please check [treemux + go-pg realworld example application](https://github.com/uptrace/go-treemux-realworld-example-app).

go-pg supports 2 last Go versions and requires a Go version with
[modules](https://github.com/golang/go/wiki/Modules) support. So make sure to initialize a Go
module:

```shell
go mod init github.com/my/repo
```

And then install go-pg (note _v10_ in the import; omitting it is a popular mistake):

```shell
go get github.com/go-pg/pg/v10
```

To connect to a database:

```go
db := pg.Connect(&pg.Options{
    Addr:     ":5432",
    User:     "user",
    Password: "pass",
    Database: "db_name",
})
```

Another popular way is using a connection string:

```go
opt, err := pg.ParseURL("postgres://user:pass@localhost:5432/db_name")
if err != nil {
   panic(err)
}

db := pg.Connect(opt)
```

To check if database is up and running:

```go
ctx := context.Background()

if err := db.Ping(ctx); err != nil {
    panic(err)
}
```

The same:

```go
_, err := db.ExecContext(ctx, "SELECT 1")
if err != nil {
    panic(err)
}
```

To select PostgreSQL version:

```go
var version string
_, err := db.QueryOneContext(ctx, pg.Scan(&version), "SELECT version()")
if err != nil {
    panic(err)
}
fmt.Println(version)
```

Following example demonstrates how to connect, create schema, insert, and select data:

```go
package pg_test

import (
    "fmt"

    "github.com/go-pg/pg/v10"
    "github.com/go-pg/pg/v10/orm"
)

type User struct {
    Id     int64
    Name   string
    Emails []string
}

func (u User) String() string {
    return fmt.Sprintf("User<%d %s %v>", u.Id, u.Name, u.Emails)
}

type Story struct {
    Id       int64
    Title    string
    AuthorId int64
    Author   *User
}

func (s Story) String() string {
    return fmt.Sprintf("Story<%d %s %s>", s.Id, s.Title, s.Author)
}

func ExampleDB_Model() {
    db := pg.Connect(&pg.Options{
        User: "postgres",
    })
    defer db.Close()

    err := createSchema(db)
    if err != nil {
        panic(err)
    }

    user1 := &User{
        Name:   "admin",
        Emails: []string{"admin1@admin", "admin2@admin"},
    }
    _, err = db.Model(user1).Insert()
    if err != nil {
        panic(err)
    }

    _, err = db.Model(&User{
        Name:   "root",
        Emails: []string{"root1@root", "root2@root"},
    }).Insert()
    if err != nil {
        panic(err)
    }

    story1 := &Story{
        Title:    "Cool story",
        AuthorId: user1.Id,
    }
    _, err = db.Model(story1).Insert()
    if err != nil {
        panic(err)
    }

    // Select user by primary key.
    user := &User{Id: user1.Id}
    err = db.Model(user).WherePK().Select()
    if err != nil {
        panic(err)
    }

    // Select all users.
    var users []User
    err = db.Model(&users).Select()
    if err != nil {
        panic(err)
    }

    // Select story and associated author in one query.
    story := new(Story)
    err = db.Model(story).
        Relation("Author").
        Where("story.id = ?", story1.Id).
        Select()
    if err != nil {
        panic(err)
    }

    fmt.Println(user)
    fmt.Println(users)
    fmt.Println(story)
    // Output: User<1 admin [admin1@admin admin2@admin]>
    // [User<1 admin [admin1@admin admin2@admin]> User<2 root [root1@root root2@root]>]
    // Story<1 Cool story User<1 admin [admin1@admin admin2@admin]>>
}

// createSchema creates database schema for User and Story models.
func createSchema(db *pg.DB) error {
    models := []interface{}{
        (*User)(nil),
        (*Story)(nil),
    }

    for _, model := range models {
        err := db.Model(model).CreateTable(&orm.CreateTableOptions{
            Temp: true,
        })
        if err != nil {
            return err
        }
    }
    return nil
}
```
