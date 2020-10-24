# SQL NULL and Go zero values

## Go zero values

By default all columns except primary keys are nullable and go-pg marshals Go zero values (empty
string, 0, zero time, nil map, and nil slice) as SQL `NULL`. You can disable this behavior with
`pg:",use_zero"`tag.

For insert queries you can also specify a default value for a column using `pg:"default:now()"` tag.
In this case go-pg uses `DEFAULT` instead of `NULL` so PostgreSQL can generate a default value when
it encounters `DEFAULT`.

## Modeling NULL values

To represent SQL `NULL`, you can use pointers and `sql.Null*` types:

```go
type Item struct {
    Active *bool
    // or
    Active sql.NullBool
}
```

For example:

- `(*bool)(nil)` and `sql.NullBool{}` represent `NULL`.
- `(*bool)(false)` and `sql.NullBool{Valid: true}` represent `FALSE`.
- `(*bool)(true)` and `sql.NullBool{Valid: true, Value: true}` represent `TRUE`.

## Updating specific columns

To update list of key-value pairs:

```go
kv := map[string]interface{}{
    "col1": "val1",
    "col2": 123,
}
db.Model(&kv).TableExpr("items").Update()
```

To update subset of columns on a struct:

```go
db.Model(&item).Column("col1", "col2").Update()
```

To update non-zero struct fields:

```go
db.Model(&item).WherePK().UpdateNotZero()
```
