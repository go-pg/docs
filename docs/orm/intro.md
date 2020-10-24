# Introduction to Object-relational mapping

In go-pg Object-relational mapping support consists of 2 related but separate things:

1.  Mapping data between Go structs and SQL tables. See [Models](/models/).
2.  Support for common table relations:

    - [Has one](/orm/has-one-relation/).
    - [Belongs to](/orm/belongs-to-relation/).
    - [Has many](/orm/has-many-relation/).
    - [Many to many](/orm/many-to-many-relation/).

The second point requires more explanation, because understanding how relations work is necessary to
write complex queries using relations that are not supported out-of-the-box.

In the following example we have a `User` model that has one `Profile` model:

```go
type Profile struct {
    ID   int
    Lang string
}

// User has one Profile.
type User struct {
    ID        int
    Name      string
    ProfileID int
    Profile   *Profile `pg:"-"`
}
```

You can select a user with his profile without defining any relations. go-pg is smart enough to map
the SQL column `profile__id` to the Go field `User.Profile.ID`.

```go
db.Model(&user).
    ColumnExpr("user.*").
    ColumnExpr("profile.id AS profile__id").
    ColumnExpr("profile.lang AS profile__lang").
    Join("LEFT JOIN profiles AS profile ON profile.user_id = user.id").
    Where("user.id = ?", 123).
    Select()
```

But you can do better by defining a relation:

```go
type User struct {
    ID        int
    Name      string
    ProfileID int
    Profile   *Profile `pg:"rel:has-one"` // note the has-one relation
}
```

Then the same query can be written as:

```go
db.Model(&user).Relation("Profile").Where("user.id = ?", 123).Select()
```
