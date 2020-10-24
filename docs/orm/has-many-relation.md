# Has many relation

In the following example we have a `User` model that has many `Profile` models.

```go
type Profile struct {
    Id     int
    Lang   string
    Active bool
    UserId int
}

// User has many profiles.
type User struct {
    Id       int
    Name     string
    Profiles []*Profile `pg:"rel:has-many"`
}

db := connect()
defer db.Close()

qs := []string{
    "CREATE TEMP TABLE users (id int, name text)",
    "CREATE TEMP TABLE profiles (id int, lang text, active bool, user_id int)",
    "INSERT INTO users VALUES (1, 'user 1')",
    "INSERT INTO profiles VALUES (1, 'en', TRUE, 1), (2, 'ru', TRUE, 1), (3, 'md', FALSE, 1)",
}
for _, q := range qs {
    _, err := db.Exec(q)
    if err != nil {
        panic(err)
    }
}

// Select user and all his active profiles with following queries:
//
// SELECT "user".* FROM "users" AS "user" ORDER BY "user"."id" LIMIT 1
//
// SELECT "profile".* FROM "profiles" AS "profile"
// WHERE (active IS TRUE) AND (("profile"."user_id") IN ((1)))

var user User
err := db.Model(&user).
    Column("user.*").
    Relation("Profiles", func(q *orm.Query) (*orm.Query, error) {
        return q.Where("active IS TRUE"), nil
    }).
    First()
if err != nil {
    panic(err)
}
fmt.Println(user.Id, user.Name, user.Profiles[0], user.Profiles[1])
// Output: 1 user 1 &{1 en true 1} &{2 ru true 1}
```
