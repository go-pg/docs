---
template: main.html
---

# Hooks

## Model Hooks

Models support optional hooks that are called before and after select, insert, update, and delete
queries. When slice model is used hooks are called for each struct in a slice.

Please note how we use
[compile time check](https://medium.com/@matryer/golang-tip-compile-time-checks-to-ensure-your-type-satisfies-an-interface-c167afed3aae)
`var _ orm.AfterScanHook = (*Book)(nil)` to ensure that type implements an interface.

```go
type Book struct{}

var _ pg.BeforeScanHook = (*Book)(nil)

func (*Book) BeforeScan(ctx context.Context) error {
    return nil
}

var _ pg.AfterScanHook = (*Book)(nil)

func (*Book) AfterScan(ctx context.Context) error {
    return nil
}

var _ pg.AfterSelectHook = (*Book)(nil)

func (b *Book) AfterSelect(ctx context.Context) error {
    return nil
}

var _ pg.BeforeInsertHook = (*Book)(nil)

func (b *Book) BeforeInsert(ctx context.Context) (context.Context, error) {
    return ctx, nil
}

var _ pg.AfterInsertHook = (*Book)(nil)

func (b *Book) AfterInsert(ctx context.Context) error {
    return updateBookCache(b)
}

var _ pg.BeforeUpdateHook = (*Book)(nil)

func (b *Book) BeforeUpdate(ctx context.Context) (context.Context, error) {
   return ctx, nil
}

var _ pg.AfterUpdateHook = (*Book)(nil)

func (b *Book) AfterUpdate(ctx context.Context) error {
   return nil
}

var _ pg.BeforeDeleteHook = (*Book)(nil)

func (b *Book) BeforeDelete(ctx context.Context) (context.Context, error) {
   return ctx, nil
}

var _ pg.AfterDeleteHook = (*Book)(nil)

func (b *Book) AfterDelete(ctx context.Context) error {
   return nil
}
```
