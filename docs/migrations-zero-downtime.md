# Zero-downtime PostgreSQL migrations

Follow these simple rules to avoid common pitfalls and apply changes to your database without
_unplanned_ downtime.

## Avoid long-running transactions

Running a migration in a transaction means that changes made within a transaction are not visible
until the end of a transaction. That is exactly what we need when we apply a migration, but in
practise it does not work well.

Using a transaction causes PostgreSQL to maintain two versions of a database for the duration of a
transaction. One version with your changes and one without. PostgreSQL
[transactions](https://www.postgresql.org/docs/13/tutorial-transactions.html){target=\_blank} are
well-suited for such task but they have their limits too.

PostgreSQL also has to hold all the locks ackquired during a migration. For example, updating a row
locks the row so your changes are not overwritten by another transaction. PostgreSQL releases the
lock only in the end of a transaction. And if a concurrent transaction actually changes the same row
migrations fails.

Using transactions only works well if your migration is small and fast (less than 5-10 seconds).
Even for a medium database using transactions either makes the migration slower (in some cases 10x
slower) or causes the migration to fail.

## Split long-running queries into smaller batches

PostgreSQL runs every query in a transaction. So not using `BEGIN` and `COMMIT` does not imply that
you are not using transactions. Meaning that you need to split long running queries into smaller
ones and avoid large transactions for the reasons we discussed above.

For example, you need to update 1 million rows. Don't do it with a single `UPDATE` query. Instead
split the job into 10 batches each containing 100k rows. And execute the same `UPDATE` query
separately on each batch. Now you have 10 queries instead of 1, but you can be sure that migration
will succeed.

## Update rows in some consistent order

When possible update rows in some consistent order. This helps avoiding deadlocks when 2 conurrent
transactions try to update the same rows but in a different order.

For example, deadlock happens when transaction 1 locks row #1 and transaction 2 locks row #2. Now
transaction 1 waits for a lock on row #2 and transaction 2 waits for a lock on row #1. They lock
each other and PostgreSQL has to kill one of them.

```sql
# transaction 1
UPDATE test WHERE id IN (1, 2)

# transaction 2
UPDATE test WHERE id IN (2, 1)
```

The same rule applies when you are using `INSERT ON CONFLICT DO UPDATE`. In this case you may need
to sort rows before inserting them.

## Don't add column with NOT NULL

`ADD column NOT NULL` query fails on tables that already have some data, because existing rows does
not have the column which means `NULL`.

```sql
> ALTER TABLE test ADD COLUMN foo text NOT NULL;

ERROR:  column "foo" of relation "test" contains null values
```

Your alternatives are:

- Drop `NOT NULL` and add some validation against `NULL` elsewhere.
- Add default value `foo text DEFAULT ''` that is returned instead of `NULL`.
- Split the query into multiple migrations:

```sql
-- migration 1
ALTER TABLE test ADD COLUMN foo text;

-- migration 2
UPDATE test SET foo = '';

-- migration 3
ALTER TABLE test ALTER COLUMN foo SET NOT NULL;
```

To avoid this problem altogether I recommend to always set `NOT NULL` constraint with a separate
query.
