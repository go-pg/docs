---
template: main.html
---

# SQL placeholders

## Introduction

go-pg recognizes `?` in queries as a placeholder and replaces it with a param. Before replacing
go-pg escapes param values according to PostgreSQL rules:

- All params are properly quoted against SQL injections.
- Null byte `'0'` is removed.
- JSON/JSONB gets `\u0000` escaped as `\\u0000`.

## Basic placeholders

To use basic placeholders:

```go
// SELECT 'foo', 'bar'
db.ColumnExpr("?, ?", 'foo', 'bar')
```

To use positional placeholders:

```go
// SELECT 'foo', 'bar', 'foo'
db.ColumnExpr("?0, ?1, ?0", 'foo', 'bar')
```

## Named placeholders

To name your placeholders, define a struct with required fields:

```go
type Params struct {
    X int
    Y int
}

params := &Params{
    X: 1,
    Y: 2,
}
// SELECT 1 + 2
db.ColumnExpr("?x + ?y", params)
```

You can even use methods that return a singe value as a placeholder:

```
func (p *Params) Sum() int {
    return p.X + p.Y
}

// SELECT 1 + 2 = 3
db.ColumnExpr("?x + ?y = ?Sum", params)
```

## PostgreSQL identifiers and disabling quotation

To quote PostgreSQL identifiers (column or table names), use `pg.Ident`:

```go
// "foo" = 'bar'
db.ColumnExpr("? = ?", pg.Ident("foo"), "bar")
```

To disable quotation altogether, use `pg.Safe`:

```go
// FROM (generate_series(0, 10)) AS foo
db.TableExpr("(?) AS foo", pg.Safe("generate_series(0, 10)"))
```

## PostgreSQL IN

To use `IN` with multiple values, use `pg.In`:

```go
// WHERE foo IN ('hello', 'world')
db.Where("foo IN (?)", pg.In([]string{"hello", "world"}))
```

To use `IN` with composite (multiple) keys:

```go
// WHERE (foo, bar) IN (('hello', 'world'), ('hell', 'yeah'))
db.Where("(foo, bar) IN (?)", pg.InMulti(
    []string{"hello", "world"},
    []string{"hell", "yeah"},
))
```

## PostgreSQL Arrays

To work with PostgreSQL arrays, use `pg.Array`:

```go
// WHERE foo @> '{"foo","bar"}'
db.Where("foo @> ?", pg.Array([]string{"foo", "bar"}))
```

## Global DB placeholders

go-pg also supports global DB placeholders:

```go
// db1 and db2 share the same connection pool.
db1 := db.WithParam("SCHEMA", "foo")
db2 := db.WithParam("SCHEMA", "bar")

// FROM foo.table
db1.TableExpr("?SCHEMA.table")

// FROM bar.table
db2.TableExpr("?SCHEMA.table")
```

[go-pg/sharding](https://github.com/go-pg/sharding) uses this feature to implement sharding using
PostgreSQL schemas.
