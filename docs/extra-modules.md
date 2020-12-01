# Extra modules

## OpenTelemetry

See [tracing](/tracing/).

## Faster JSON encoding by segmentio

```go
import (
    "github.com/go-pg/pg/v10/pgjson"
    "github.com/go-pg/pg/extra/pgsegment"
)

func init() {
    pgjson.SetProvider(&pgsegment.JSONProvider{})
}
```

## Print failed queries using DebugHook

```go
import "github.com/go-pg/pg/extra/pgdebug"

db := pg.Connect(&pg.Options{...})

if debug {
    db.AddQueryHook(pgdebug.DebugHook{
        //Verbose: true,
    })
}
```
