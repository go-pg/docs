# Many to many relation

In the following example we have an `Order` model that has many `Item` models. Because the same item
can be added to multiple orders, we need an intermediary `order_to_items` table.

```go
package pg_test

import (
    "fmt"

    "github.com/go-pg/pg/v10"
    "github.com/go-pg/pg/v10/orm"
)

func init() {
    // Register many to many model so ORM can better recognize m2m relation.
    // This should be done before dependant models are used.
    orm.RegisterTable((*OrderToItem)(nil))
}

type Order struct {
    Id    int
    Items []Item `pg:"many2many:order_to_items"`
}

type Item struct {
    Id int
}

type OrderToItem struct {
    OrderId int
    ItemId  int
}

func ExampleDB_Model_manyToMany() {
    db := connect()
    defer db.Close()

    if err := createManyToManyTables(db); err != nil {
        panic(err)
    }

    values := []interface{}{
        &Item{Id: 1},
        &Item{Id: 2},
        &Order{Id: 1},
        &OrderToItem{OrderId: 1, ItemId: 1},
        &OrderToItem{OrderId: 1, ItemId: 2},
    }
    for _, v := range values {
        _, err := db.Model(v).Insert()
        if err != nil {
            panic(err)
        }
    }

    // Select order and all items with following queries:
    //
    // SELECT "order"."id" FROM "orders" AS "order" ORDER BY "order"."id" LIMIT 1
    //
    // SELECT order_to_items.*, "item"."id" FROM "items" AS "item"
    // JOIN order_to_items AS order_to_items ON (order_to_items."order_id") IN (1)
    // WHERE ("item"."id" = order_to_items."item_id")

    order := new(Order)
    err := db.Model(order).Relation("Items").First()
    if err != nil {
        panic(err)
    }
    fmt.Println("Order", order.Id, "Items", order.Items[0].Id, order.Items[1].Id)

    // Select order and all items sorted by id with following queries:
    //
    // SELECT "order"."id" FROM "orders" AS "order" ORDER BY "order"."id" LIMIT 1
    //
    // SELECT order_to_items.*, "item"."id" FROM "items" AS "item"
    // JOIN order_to_items AS order_to_items ON (order_to_items."order_id") IN (1)
    // WHERE ("item"."id" = order_to_items."item_id")
    // ORDER BY item.id DESC

    order = new(Order)
    err = db.Model(order).
        Relation("Items", func(q *pg.Query) (*pg.Query, error) {
            q = q.OrderExpr("item.id DESC")
            return q, nil
        }).
        First()
    if err != nil {
        panic(err)
    }
    fmt.Println("Order", order.Id, "Items", order.Items[0].Id, order.Items[1].Id)

    // Output: Order 1 Items 1 2
    // Order 1 Items 2 1
}

func createManyToManyTables(db *pg.DB) error {
    models := []interface{}{
        (*Order)(nil),
        (*Item)(nil),
        (*OrderToItem)(nil),
    }
    for _, model := range models {
        err := db.Model(model).CreateTable(&orm.CreateTableOptions{
            Temp: true,
        })
        if err != nil {
            return err
        }
    }
    return nil
}
```
