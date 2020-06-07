# FAQ

## How to check connection health?

Starting from v10 use:

```go
if err := db.Ping(ctx); err != nil {
    fmt.Println("PostgreSQL is down", err)
}
```

On older versions:

```go
_, err := db.Exec("SELECT 1")
if err != nil {
    fmt.Println("PostgreSQL is down")
}
```

## How to insert zero/false value?

All Go zero values (zero, empty string, `false`, and `nil`) are marshaled as SQL
`DEFAULT` which typically is stored as `NULL`. If you want to insert zero values
as is please use `pg:",use_zero"` tag on the field.

```go
type Item struct {
    Available bool `pg:",use_zero"`
}
```

## How to view queries this library generates?

You can setup query logger like this:

```go
type dbLogger struct { }

func (d dbLogger) BeforeQuery(c context.Context, q *pg.QueryEvent) (context.Context, error) {
    return c, nil
}

func (d dbLogger) AfterQuery(c context.Context, q *pg.QueryEvent) error {
    fmt.Println(q.FormattedQuery())
    return nil
}

db := pg.Connect(&pg.Options{...})
db.AddQueryHook(dbLogger{})
```

Or you can configure PostgreSQL to log every query by adding following lines to
your postgresql.conf (usually /etc/postgresql/9.5/main/postgresql.conf):

```
log_statement = 'all'
log_min_duration_statement = 0
```

Then just tail the log file:

```shell
tail -f /var/log/postgresql/postgresql-9.5-main.log
```

## How to connect to Google Cloud SQL using proxy?

```go
import "github.com/GoogleCloudPlatform/cloudsql-proxy/proxy/proxy"

db := pg.Connect(&pg.Options{
    Dialer: func(network, addr string) (net.Conn, error) {
        return proxy.Dial("project-name:region:instance-name")
    },
})
```

## How to connect to Google Cloud SQL from App Engine (standard environment)?

```go
// +build appengine

package myapp

import (
    "net"
    "os"

    "github.com/go-pg/pg"
    "google.golang.org/appengine"
    "google.golang.org/appengine/cloudsql"
)

func NewDB() *pg.DB {
    // Connect to local instance in development
    // Environment variables can be set via app.yaml
    if appengine.IsDevAppServer() {
        return pg.Connect(&pg.Options{
            Addr:     os.Getenv("LOCALSQL_HOST")+":"+os.Getenv("LOCALSQL_PORT"),
            User:     os.Getenv("LOCALSQL_USER"),
            Password: os.Getenv("LOCALSQL_PASS"),
            Database: os.Getenv("LOCALSQL_NAME"),
        })
    }

    // Connect to Cloud SQL in production
    // Environment variables can be set via app.yaml
    return pg.Connect(&pg.Options{
        Dialer: func(network, addr string) (net.Conn, error) {
            return cloudsql.Dial(os.Getenv("CLOUDSQL_HOST")) // project-name:region:instance-name
        },
        User:     os.Getenv("CLOUDSQL_USER"),
        Password: os.Getenv("CLOUDSQL_PASS"),
        Database: os.Getenv("CLOUDSQL_NAME"),
    })
}
```

## How to get last inserted id?

`LastInsertId` is a concept from MySQL world - PostgreSQL does not support it.
Instead you should use `RETURNING` as described in details at
[StackOverflow](https://stackoverflow.com/questions/2944297/postgresql-function-for-last-inserted-id):

```go
_, err := tx.QueryOne(record, "INSERT INTO test_table (x) VALUES ('x') RETURNING id", record)
```

or using ORM:

```go
_, err := db.Model(&record).Returning("id").Update()
```

go-pg automatically scans the returned data into the model just like with
`SELECT id` query. `DB.Insert` should automatically add `Returning` for you.

## How to test / mock database?

I recommend to use real PostgreSQL database in your tests. To reset state for
your tests, drop and create required tables. It may take some time, but:

- code is tested against real database;
- you don't have to write mocks.

To make tests faster consider using following PostgreSQL config:

```
fsync = off
synchronous_commit = off
archive_mode = off
wal_level = minimal
shared_buffers = 512MB
```

Alternatively you can start a transaction before each test and rollback it after
each test. This is faster, but does not allow to test code that uses
transactions.
