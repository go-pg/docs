---
template: main.html
---

# Models

Models are defined using Go structs which are mapped to PostgreSQL tables. Exported struct fields
are mapped to table columns, unexported fields are ignored.

## Struct tags

To override defaults, use following optional struct field tags:

| Tag                                                  | Comment                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| tableName struct{} \`pg:"table_name"\`               | Override default table name.                                       |
| tableName struct{} \`pg:"alias:table_alias"\`        | Override default table alias name.                                 |
| tableName struct{} \`pg:"select:view_name"\`         | Override table name for SELECT queries.                            |
| tableName struct{} \`pg:",discard_unknown_columns"\` | Silently discard uknown columns instead of returning an error.     |
| pg:"-"                                               | Ignore the field.                                                  |
| pg:"column_name"                                     | Override default column name.                                      |
| pg:"alias:alt_name"                                  | Alternative column name.                                           |
| pg:",pk"                                             | Mark column as a primary key. Multiple primary keys are supported. |
| pg:",nopk"                                           | Not a primary key. Useful for columns like `id` and `uuid`.        |
| pg:"type:uuid"                                       | Override default SQL type.                                         |
| pg:"default:gen_random_uuid()"                       | SQL default value for the column.                                  |
| pg:",notnull"                                        | Add `NOT NULL` SQL constraint.                                     |
| pg:",unique"                                         | Make `CreateTable` to create an unique constraint.                 |
| pg:",unique:group_name"                              | Unique constraint for a group of columns.                          |
| pg:"on_delete:RESTRICT"                              | Override `ON DELETE` clause for foreign keys.                      |
| pg:",array"                                          | Enable PostgreSQL array support.                                   |
| pg:",hstore"                                         | Enable PostgreSQL hstore support.                                  |
| pg:"composite:type_name"                             | Enable PostgreSQL composite support.                               |
| pg:",use_zero"                                       | Disable marshaling Go zero values as SQL `NULL`.                   |
| pg:",json_use_number"                                | Use `json.Decoder.UseNumber` to decode JSON.                       |
| pg:",msgpack"                                        | Encode/decode data using MsgPack.                                  |
| DeletedAt time.Time \`pg:",soft_delete"\`            | Enable soft deletes support.                                       |

Additionally following tags can be used on ORM relations (not columns):

| Tag                                                 | Comment                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| User \*User \`pg:"fk:user_id"\`                     | Overrides default foreign key for base table.                            |
| Comments []Comment \`pg:"polymorphic:trackable\_"\` | Column prefix for polymorphic has-many relation.                         |
| Genres []Genre \`pg:"many2many:book_genres"\`       | Junction table for many-to-many relation.                                |
| Genres []Genre \`pg:"join_fk:book_id"\`             | Overrides default foreign key for joined table in many-to-many relation. |

## Naming conventions

To avoid errors, use [snake_case](https://en.wikipedia.org/wiki/Snake_case) names.

If you get spurious parser errors you should try to quote the identifier to see if the problem goes
away.

<!-- prettier-ignore -->
!!! Warning
    Don't use
    [SQL keywords](https://www.postgresql.org/docs/12/sql-keywords-appendix.html)
    (for example `order`, `user`) as an identifier.

<!-- prettier-ignore -->
!!! Warning
    Don't use case-sensitive names because such names are folded
    to lower case (for example `UserOrders` becomes `userorder`).

## Table name

Table name and alias are automatically derived from the struct name by underscoring it. Table name
is also pluralized, for example struct `Genre` gets table name `genres` and alias `genre`. Default table
name and alias can be overrided using `tableName` field:

```go
type Genre struct {
    tableName struct{} `pg:"genres,alias:g"`
}
```

To specify different table name for `SELECT` queries:

```go
type Genre struct {
    tableName struct{} `pg:"select:genres_view,alias:g"`
}
```

To quote problematic identifier:

```go
type User struct {
    tableName struct{} `pg:"\"user\",alias:u"`
}
```

To override default function that pluralizes struct name:

```go
func init() {
    orm.SetTableNameInflector(func(s string) string {
        return "myprefix_" + s
    })
}
```

## Column names

Column name is derived from the struct field name by underscoring it, for example struct field `ParentId`
gets column name `parent_id`. Default column name can be overridden using `pg` tag:

```go
type Genre struct {
    Id int `pg:"pk_id"`
}
```

Column type is derived from struct field type, for example Go `string` is mapped to PostgreSQL `text`.
Default column type can be overriden with `pg:"type:varchar(255)"` tag.

| Go type            | PostgreSQL type  |
| ------------------ | ---------------- |
| int8, uint8, int16 | smallint         |
| uint16, int32      | integer          |
| uint32, int64, int | bigint           |
| uint, uint64       | bigint           |
| float32            | real             |
| float64            | double precision |
| bool               | boolean          |
| string             | text             |
| []byte             | bytea            |
| struct, map, array | jsonb            |
| time.Time          | timestamptz      |
| net.IP             | inet             |
| net.IPNet          | cidr             |

To use PostgreSQL array, add `pg:",array"`
[struct tag](https://pkg.go.dev/github.com/go-pg/pg/v10?tab=doc#example-DB-Model-PostgresArrayStructTag)
or use [pg.Array wrapper](https://pkg.go.dev/github.com/go-pg/pg/v10?tab=doc#example-Array).

To use PostgreSQL Hstore, add `pg:",hstore"`
[struct tag](https://pkg.go.dev/github.com/go-pg/pg/v10?tab=doc#example-DB-Model-HstoreStructTag) or
use [pg.Hstore wrapper](https://pkg.go.dev/github.com/go-pg/pg/v10?tab=doc#example-Hstore).

To discard unknown columns, add tag `pg:",discard_unknown_columns"` on `tableName` struct field.

## SQL NULL and Go zero values

By default all columns except primary keys are nullable and go-pg marshals Go zero values (empty
string, 0, zero time, nil map, and nil slice) as SQL `NULL`. This behavior can be changed using
`pg:",use_zero"`tag.

Default value for a column can be specified on SQL level using `pg:"default:now()"` tag.

## Example

Please _note_ that most struct tags in the following example have the same values as the defaults
and are included only for demonstration purposes. Start defining your models without using any tags.

```go
type Genre struct {
    // tableName is an optional field that specifies custom table name and alias.
    // By default go-pg generates table name and alias from struct name.
    tableName struct{} `pg:"genres,alias:genre"` // default values are the same

    Id     int // Id is automatically detected as primary key
    Name   string
    Rating int `pg:"-"` // - is used to ignore field

    Books []Book `pg:"many2many:book_genres"` // many to many relation

    ParentId  int
    Subgenres []Genre `pg:"fk:parent_id"` // fk specifies foreign key
}

type Image struct {
    Id   int
    Path string
}

type Author struct {
    ID    int     // both "Id" and "ID" are detected as primary key
    Name  string  `pg:",unique"`
    Books []*Book // has many relation

    AvatarId int
    Avatar   Image
}

func (a Author) String() string {
    return fmt.Sprintf("Author<ID=%d Name=%q>", a.ID, a.Name)
}

type BookGenre struct {
    tableName struct{} `pg:"alias:bg"` // custom table alias

    BookId  int `pg:",pk"` // pk tag is used to mark field as primary key
    Book    *Book
    GenreId int `pg:",pk"`
    Genre   *Genre

    Genre_Rating int // belongs to and is copied to Genre model
}

type Book struct {
    Id        int
    Title     string
    AuthorID  int
    Author    Author // has one relation
    EditorID  int
    Editor    *Author   // has one relation
    CreatedAt time.Time `pg:"default:now()"`
    UpdatedAt time.Time

    Genres       []Genre       `pg:"many2many:book_genres"` // many to many relation
    Translations []Translation // has many relation
    Comments     []Comment     `pg:"polymorphic:trackable_"` // has many polymorphic relation
}

func (b *Book) BeforeInsert(db orm.DB) error {
    if b.CreatedAt.IsZero() {
        b.CreatedAt = time.Now()
    }
    return nil
}

// BookWithCommentCount is like Book model, but has additional CommentCount
// field that is used to select data into it. The use of `pg:",inherit"` tag
// is essential here and it is used to inherit internal model properties such as table name.
type BookWithCommentCount struct {
    Book `pg:",inherit"`

    CommentCount int
}

type Translation struct {
    tableName struct{} `pg:",alias:tr"` // custom table alias

    Id     int
    BookId int    `pg:"unique:book_id_lang"`
    Book   *Book  // has one relation
    Lang   string `pg:"unique:book_id_lang"`

    Comments []Comment `pg:",polymorphic:trackable_"` // has many polymorphic relation
}

type Comment struct {
    TrackableId   int    // Book.Id or Translation.Id
    TrackableType string // "Book" or "Translation"
    Text          string
}
```
