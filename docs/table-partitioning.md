# Declarative Table Partitioning

This documents explains how to use
[Declarative Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
with go-pg.

## Creating Parent Table Partition

go-pg supports partitioned PostgreSQL table creation. By using `pg:"partition_by:..."` tag, go-pg
creates a table with `PARTITION BY ...`. You can define any partition expression after
`partition_by` tag. For example, `pg:"partition_by:RANGE(log_time)"` translates to
`PARTITION BY RANGE(log_time)`.

For instance, to create `logs` table with three columns and partitioned by `log_time`:

- `id` big serial.
- `log_string` varchar.
- `log_time` timestampz.
- `(id, log_time)` as primary key, because partition key must included in the primary key.

You define the following struct:

```go
// Log is a data structure to save log string partitioned by time range.
type Log struct {
    tableName struct{} `pg:"logs,partition_by:RANGE(log_time)"`

    Id        int       `pg:"id,pk"`
    LogString string    `pg:"log_string"`
    LogTime   time.Time `pg:"log_time,pk"`
}
```

Then you can create the table by calling `CreateTable`:

```go
// creates database schema for Log models.
err := db.Model(&Log{}).CreateTable(&orm.CreateTableOptions{
    IfNotExists: true,
})
```

The code above generates the following SQL query:

```sql
CREATE TABLE IF NOT EXISTS "logs" (
    "id" bigserial,
    "log_string" text,
    "log_time" timestamptz,
    PRIMARY KEY ("id", "log_time")
) PARTITION BY RANGE(log_time)
```

## Creating Child Table Partition

go-pg does not handle creation of a child table. Therefore, you must create a partition before you
insert a row into a partitioned table.

The function `createNewPartition` creates a child table partition from the first date of
`currentTime` to the first date of the following month. For example, when you declare `currenTime`
as `2020-01-12` it will create time range between `2020-01-01` to `2020-02-01`:

```sql
CREATE TABLE IF NOT EXISTS logs_y2020_m01
PARTITION OF logs
FOR VALUES FROM ('2020-01-01T00:00:00Z') TO ('2020-02-01T00:00:00Z')
```

```go
package main

import (
    "log"
    "time"

    "github.com/go-pg/pg/v10"
    "github.com/go-pg/pg/v10/orm"
)

func main() {
    db := pg.Connect(&pg.Options{
        Addr:     "localhost:5432",
        User:     "postgres",
        Password: "postgres",
        Database: "db_name",
    })

    defer func() {
        if err := db.Close(); err != nil {
            log.Println(err.Error())
        }
    }()

    // creates database schema for Log models.
    err = db.Model(&Log{}).CreateTable(&orm.CreateTableOptions{
        IfNotExists: true,
    })
    if err != nil {
        log.Fatal(err)
    }

    logStartTime := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
    logEndTime := logStartTime.AddDate(0, 0, 3)
    for logStartTime.Unix() <= logEndTime.Unix() {
        logData := &Log{
            LogString: fmt.Sprintf("Log at %s", logStartTime.String()),
            LogTime:   logStartTime,
        }

        // Before insert, always try create partition
        err = createNewPartition(db, logStartTime)
        if err != nil {
            log.Fatal(err)
        }

        _, err = db.Model(logData).Insert()
        if err != nil {
            log.Fatal(err)
        }

        logStartTime = logStartTime.AddDate(0, 0, 1)
    }
}

// createNewPartition will create new partition of logs table if not exist.
// Partition created by in one month range start from first date of the month to last date of the month.
func createNewPartition(db *pg.DB, currentTime time.Time) error {
    firstOfMonth := time.Date(currentTime.Year(), currentTime.Month(), 1, 0, 0, 0, 0, time.UTC)
    firstOfNextMonth := firstOfMonth.AddDate(0, 1, 0)

    year := firstOfMonth.Format("2006")
    month := firstOfMonth.Format("01")
    sql := fmt.Sprintf(
        `CREATE TABLE IF NOT EXISTS logs_y%s_m%s PARTITION OF logs FOR VALUES FROM ('%s') TO ('%s');`,
        year, month,
        firstOfMonth.Format(time.RFC3339Nano),
        firstOfNextMonth.Format(time.RFC3339Nano),
    )

    _, err := db.Exec(sql)
    return err
}
```
