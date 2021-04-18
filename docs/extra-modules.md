# Extra modules

## OpenTelemetry

See [tracing](/tracing/).

## Faster JSON encoding by segmentio

```go
import (
    "github.com/go-pg/pg/v10/pgjson"
    "github.com/go-pg/pg/extra/pgsegment/v10"
)

func init() {
    pgjson.SetProvider(pgsegment.NewJSONProvider())
}
```

## Print failed queries using DebugHook

```go
import "github.com/go-pg/pg/extra/pgdebug/v10"

db := pg.Connect(&pg.Options{...})

if debug {
    db.AddQueryHook(pgdebug.NewDebugHook())
}
```
