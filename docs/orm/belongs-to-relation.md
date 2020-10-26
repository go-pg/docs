# Belongs to relation

In the following example we have a `Profile` model that belongs to a `User` model.

```go
// Profile belongs to User.
type Profile struct {
    Id     int
    Lang   string
    UserId int
}

type User struct {
    Id      int
    Name    string
    Profile *Profile `pg:"rel:belongs-to"`
}

db := connect()
defer db.Close()

qs := []string{
    "CREATE TEMP TABLE users (id int, name text)",
    "CREATE TEMP TABLE profiles (id int, lang text, user_id int)",
    "INSERT INTO users VALUES (1, 'user 1'), (2, 'user 2')",
    "INSERT INTO profiles VALUES (1, 'en', 1), (2, 'ru', 2)",
}
for _, q := range qs {
    _, err := db.Exec(q)
    if err != nil {
        panic(err)
    }
}

// Select users joining their profiles with following query:
//
// SELECT
//   "user".*,
//   "profile"."id" AS "profile_id",
//   "profile"."lang" AS "profile_lang"
// FROM "users" AS "user"
// LEFT JOIN "profiles" AS "profile" ON "profile"."id" = "user"."profile_id"

var users []User
err := db.Model(&users).
    Column("user.*").
    Relation("Profile").
    Select()
if err != nil {
    panic(err)
}

fmt.Println(len(users), "results")
fmt.Println(users[0].Id, users[0].Name, users[0].Profile)
fmt.Println(users[1].Id, users[1].Name, users[1].Profile)
// Output: 2 results
// 1 user 1 &{1 en 1}
// 2 user 2 &{2 ru 2}
```
