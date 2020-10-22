# Transactions

go-pg supports PostgreSQL transactions using `BEGIN`, `COMMIT`, and `ROLLBACK`:

```go
tx, err := db.Begin()
// Make sure to close transaction if something goes wrong.
defer tx.Close()

if err := doSomething(ctx, tx); err != nil {
    // Rollback on error.
    _ = tx.Rollback()
    return
}

// Commit on success.
if err := tx.Commit(); err != nil {
    panic(err)
}
```

You can also use `RunInTransaction` helper that rollbacks the transaction on error or commits it
otherwise:

```go
if err := db.RunInTransaction(ctx, func(tx *Tx) error {
    return doSomething(ctx, tx)
}); err != nil {
    panic(err)
}
```

Transactions have the usual go-pg API, but they don't support automatic retries:

```go
err := tx.Model(&item).Where("id = ?", 1).Select()

_, err := tx.Exec("SAVEPOINT my_savepoint")
```
