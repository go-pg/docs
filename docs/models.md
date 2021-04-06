---
template: main.html
---

# Defining models

For each PostgreSQL table you need to define a corresponding Go struct (model). go-pg maps exported
struct fields to table columns and ignores unexported fields.

## Struct tags

go-pg uses sensible defaults to generate names and types, but you can use the following struct tags
to override the defaults.

| Tag                                                  | Comment                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| tableName struct{} \`pg:"table_name"\`               | Overrides default table name.                                                                                                   |
| tableName struct{} \`pg:"alias:table_alias"\`        | Overrides default table alias name.                                                                                             |
| tableName struct{} \`pg:"select:view_name"\`         | Overrides table name for SELECT queries.                                                                                        |
| tableName struct{} \`pg:",discard_unknown_columns"\` | Silently discards uknown columns instead of returning an error.                                                                 |
| pg:"-"                                               | Ignores the field.                                                                                                              |
| pg:"column_name"                                     | Overrides default column name.                                                                                                  |
| pg:"alias:alt_name"                                  | Alternative column name. Useful when you are renaming the column.                                                               |
| pg:",pk"                                             | Marks column as a primary key. Multiple primary keys are supported.                                                             |
| pg:",nopk"                                           | Not a primary key. Useful for columns like `id` and `uuid`.                                                                     |
| pg:"type:uuid"                                       | Overrides default SQL type.                                                                                                     |
| pg:"default:gen_random_uuid()"                       | SQL default value for the column. go-pg uses the `DEFAULT` placeholder and PostgreSQL replaces it with the provided expression. |
| pg:",notnull"                                        | Adds `NOT NULL` SQL constraint.                                                                                                 |
| pg:",unique"                                         | Makes `CreateTable` to add an unique constraint.                                                                                |
| pg:",unique:group_name"                              | Unique constraint for a group of columns.                                                                                       |
| pg:"on_delete:RESTRICT"                              | `ON DELETE` clause for foreign keys.                                                                                            |
| pg:",array"                                          | Treats the column as a PostgreSQL array.                                                                                        |
| pg:",hstore"                                         | Treats the column as a PostgreSQL hstore.                                                                                       |
| pg:"composite:type_name"                             | Treats the column as a PostgreSQL composite.                                                                                    |
| pg:",use_zero"                                       | Disables marshaling Go zero values as SQL `NULL`.                                                                               |
| pg:",json_use_number"                                | Uses `json.Decoder.UseNumber` to decode JSON.                                                                                   |
| pg:",msgpack"                                        | Encodes/decodes data using MessagePack.                                                                                         |
| pg:"partition_by:RANGE (time)"                       | Specifies table partitioning for `CreateTable`.                                                                                 |
| DeletedAt time.Time \`pg:",soft_delete"\`            | Enables soft delete.                                                                                                            |

Additionally the following tags can be used on ORM relations (not columns):

| Tag                                                            | Comment                                           |
| -------------------------------------------------------------- | ------------------------------------------------- |
| `` Editor *Author `pg:"rel:has-one"` ``                        | Marks Editor field as a has-one relation.         |
| `` User *User `pg:"fk:user_id"` ``                             | Overrides default foreign key for a base table.   |
| `` Genres []Genre `pg:"join_fk:book_id"` ``                    | Overrides default foreign key for a joined table. |
| `` Comments []Comment `pg:"polymorphic,join_fk:trackable_"` `` | Polymorphic has-many relation.                    |
| `` Genres []Genre `pg:"many2many:book_genres"` ``              | Junction table for many-to-many relation.         |

## SQL naming convention

To avoid errors, use [snake_case](https://en.wikipedia.org/wiki/Snake_case) names. If you get
spurious SQL parser errors, try to quote the identifier with double quotes to check if the problem
goes away.

<!-- prettier-ignore -->
!!! Warning
    Don't use
    [SQL keywords](https://www.postgresql.org/docs/12/sql-keywords-appendix.html)
    (for example `order`, `user`) as an identifier.

<!-- prettier-ignore -->
!!! Warning
    Don't use case-sensitive names because such names are folded
    to lower case (for example `UserOrders` becomes `userorders`).

## Table name

Table name and alias are automatically derived from the struct name by underscoring it. Table name
is also pluralized, for example struct `Genre` gets table name `genres` and alias `genre`. You can
override the default table name and alias using `tableName` field:

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

To quote a problematic identifier:

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

Column name is derived from the struct field name by underscoring it, for example struct field
`ParentId` gets column name `parent_id`. Default column name can be overridden using `pg` tag:

```go
type Genre struct {
    Id int `pg:"pk_id"`
}
```

go-pg derives column type from a struct field type, for example Go `string` gets PostgreSQL type
`text`. You can override default column type with `pg:"type:varchar(255)"` tag.

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

## Discarding unknown columns

To discard an unknown column, prefix it with underscore, for example `_ignore_me`. You can also add
tag `` tableName struct{} `pg:",discard_unknown_columns"` `` to discard all unknown columns.

## Example

Please _note_ that most struct tags in the following example have the same values as the defaults
and are included only for demonstration purposes. Start defining your models without using any tags.

```go
type Genre struct {
    // tableName is an optional field that specifies custom table name and alias.
    // By default go-pg generates table name and alias from struct name.
    tableName struct{} `pg:"genres,alias:genre"` // default values are the same

    ID     int
    Name   string
    Rating int `pg:"-"` // - is used to ignore field

    Books []Book `pg:"many2many:book_genres"`

    ParentID  int
    Subgenres []Genre `pg:"rel:has-many,join_fk:parent_id"`
}

type Image struct {
    ID   int
    Path string
}

type Author struct {
    ID    int
    Name  string  `pg:",unique"`
    Books []*Book `pg:"rel:has-many"`

    AvatarID int
    Avatar   Image `pg:"rel:has-one"`
}

type BookGenre struct {
    tableName struct{} `pg:"alias:bg"` // custom table alias

    BookID  int    `pg:",pk"` // pk tag is used to mark field as primary key
    Book    *Book  `pg:"rel:has-one"`
    GenreID int    `pg:",pk"`
    Genre   *Genre `pg:"rel:has-one"`

    Genre_Rating int // belongs to and is copied to Genre model
}

type Book struct {
    ID        int
    Title     string
    AuthorID  int
    Author    Author `pg:"rel:has-one"`
    EditorID  int
    Editor    *Author   `pg:"rel:has-one"`
    CreatedAt time.Time `pg:"default:now()"`
    UpdatedAt time.Time

    Genres       []Genre       `pg:"many2many:book_genres"` // many to many relation
    Translations []Translation `pg:"rel:has-many"`
    Comments     []Comment     `pg:"rel:has-many,join_fk:trackable_,polymorphic"`
}

// BookWithCommentCount is like Book model, but has additional CommentCount
// field that is used to select data into it. The use of `pg:",inherit"` tag
// is essential here so it inherits internal model properties such as table name.
type BookWithCommentCount struct {
    Book `pg:",inherit"`

    CommentCount int
}

type Translation struct {
    tableName struct{} `pg:",alias:tr"` // custom table alias

    ID     int
    BookID int    `pg:"unique:book_id_lang"`
    Book   *Book  `pg:"rel:has-one"`
    Lang   string `pg:"unique:book_id_lang"`

    Comments []Comment `pg:"rel:has-many,join_fk:trackable_,polymorphic"`
}

type Comment struct {
    TrackableID   int    // Book.ID or Translation.ID
    TrackableType string // "Book" or "Translation"
    Text          string
}
```
