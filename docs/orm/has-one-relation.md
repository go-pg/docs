# Has one relation

In the the following example we have a `User` model that has one `Profile` model.

```go
type Profile struct {
    Id   int
    Lang string
}

// User has one profile.
type User struct {
    Id        int
    Name      string
    ProfileId int
    Profile   *Profile `pg:"rel:has-one"`
}

db := connect()
defer db.Close()

qs := []string{
    "CREATE TEMP TABLE users (id int, name text, profile_id int)",
    "CREATE TEMP TABLE profiles (id int, lang text)",
    "INSERT INTO users VALUES (1, 'user 1', 1), (2, 'user 2', 2)",
    "INSERT INTO profiles VALUES (1, 'en'), (2, 'ru')",
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
//   "profile"."id" AS "profile__id",
//   "profile"."lang" AS "profile__lang",
//   "profile"."user_id" AS "profile__user_id"
// FROM "users" AS "user"
// LEFT JOIN "profiles" AS "profile" ON "profile"."user_id" = "user"."id"

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
// 1 user 1 &{1 en}
// 2 user 2 &{2 ru}
```
