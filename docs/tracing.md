---
template: main.html
---

# Tracing and errors monitoring

go-pg supports tracing out-of-the-box using
[OpenTelemetry](https://opentelemetry.io/){target=\_blank} API. To enable queries instrumentation,
use the following code:

```go
import (
	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/extra/pgotel/v10"
)

db := pg.Connect(&pg.Options{...})

db.AddQueryHook(pgotel.NewTracingHook())
```

The hook sends SELECT, UPDATE, and DELETE queries as is. But it strips data values from INSERT
queries since they can contain sensitive information.

This is how span looks at Uptrace.dev which is an OpenTelemetry backend that supports
[distributed traces, logs, and errors](https://uptrace.dev/explore/1/groups/?system=db%3Apostgresql&utm_source=pg&utm_campaign=pg-tracing).

![PostgreSQL trace and spans](img/sql-span.png)
