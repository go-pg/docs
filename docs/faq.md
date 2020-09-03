---
template: main.html
---

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

All Go zero values (zero, empty string, `false`, and `nil`) are marshaled as SQL `DEFAULT` which
typically is stored as `NULL`. To insert zero values as is please use `pg:",use_zero"`
tag on the field.

```go
type Item struct {
    Available bool `pg:",use_zero"`
}
```

## How to view queries this library generates?

Starting from v10 use:

```go
db.AddQueryHook(pgext.DebugHook{})
```

On older versions:

```go
import "github.com/go-pg/pg/v10/pgext"

// DebugHook is a query hook that logs the query and the error if there are any.
// It can be installed with:
//
//   db.AddQueryHook(pgext.DebugHook{})
type DebugHook struct{}

var _ pg.QueryHook = (*DebugHook)(nil)

func (DebugHook) BeforeQuery(ctx context.Context, evt *pg.QueryEvent) (context.Context, error) {
    q, err := evt.FormattedQuery()
    if err != nil {
        return nil, err
    }

    if evt.Err != nil {
        log.Printf("Error %s executing query:\n%s\n", evt.Err, q)
    } else {
        log.Printf("%s", q)
    }

    return ctx, nil
}

func (DebugHook) AfterQuery(context.Context, *pg.QueryEvent) error {
    return nil
}

db.AddQueryHook(DebugHook{})
```

Or you can configure PostgreSQL to log every query by adding following lines to your postgresql.conf
(usually /etc/postgresql/9.5/main/postgresql.conf):

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

`LastInsertId` is a concept from MySQL world - PostgreSQL does not support it. Instead you should
use `RETURNING` as described in details at
[Stack Overflow](https://stackoverflow.com/questions/2944297/postgresql-function-for-last-inserted-id):

```go
_, err := tx.QueryOne(record, "INSERT INTO test_table (x) VALUES ('x') RETURNING id", record)
```

Or using ORM:

```go
_, err := db.Model(&record).Returning("id").Update()
```

Go-pg automatically scans the returned data into the model just like with `SELECT id` query.
`DB.Insert` should automatically add `Returning` for you.

## How to test / mock database?

I recommend to use real PostgreSQL database in your tests. To reset state for your tests, drop and
create required tables. It may take some time, but:

- Code is tested against real database;
- You don't have to write mocks.

To make tests faster consider using following PostgreSQL config:

```
fsync = off
synchronous_commit = off
archive_mode = off
wal_level = minimal
shared_buffers = 512MB
```

Alternatively you can start a transaction before each test and rollback it after each test. This is
faster, but does not allow to test code that uses transactions.
