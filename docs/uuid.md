# Using UUID in PostgreSQL

## Installing UUID extension

PostgreSQL requires an extension to support UUID column type. The extenstion comes with
`postgresql-contrib-*` package:

```shell
sudo apt install postgresql-contrib-13
```

Then you need to install the extension in each database you are going to use it:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Installing UUID library

For working with UUIDs in Go you need to install
[google/uuid](https://pkg.go.dev/github.com/google/uuid) package.

```shell
go get github.com/google/uuid
```

[satori/go.uuid](https://github.com/satori/go.uuid) works too, but it has not been updated for some
time.

## Definining a model

Now all you need to do is to specify a SQL type and a default expression:

```go
import (
	"github.com/go-pg/pg/v10"
	"github.com/google/uuid"
)

type Story struct {
	ID       uuid.UUID `pg:"type:uuid,default:uuid_generate_v4()"`
	Title    string
	AuthorID uuid.UUID `pg:"type:uuid,default:uuid_generate_v4()"`
}
```
