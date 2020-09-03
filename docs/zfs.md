---
template: main.html
---

# Tuning PostgreSQL on ZFS

The main reason to use ZFS instead of ext4/xfs is compression. With reasonable configuration you can
achieve 3-5x compression ratio using LZ4. That means that LZ4 compresses 1 terabyte of data down to
~300 gigabytes. With ZSTD compression is even better.

The second reason is the Adaptive Replacement Cache (ARC) cache. ARC is a page replacement algorithm
with better performance than Linux page cache. Since it caches compressed blocks you can also fit
more data into the same RAM.

The recommended ZFS configuration for PostgreSQL looks like this:

- `recordsize=128k` - same as default.
- `compression=lz4` - enables lz4 compression.
- `atime=off` - disables access time update.
- `xattr=sa` - better extended attributes.
- `logbias=latency` - same as default.
- `redundant_metadata=most` - may improve random writes.

If you are going to use ZFS snapshots, create separate dataset for PostgreSQL WAL files. This way
snapshots of your main data will be smaller.

### ZFS recordsize

The `recordsize` is the size of the largest block of data that ZFS will read/write. ZFS compresses
each block individually and compression is better for larger blocks. Use the default
`recordsize=128k` and decrease it to 32-64k if you need more TPS (transactions per second). Setting
`recordsize=8k` to match PostgreSQL block size reduces compression efficiency and is not
recommended.

- Larger `recordsize` means better compression. It also improves read/write performance if you
  operate with lots of data (tens of megabytes).
- Smaller `recordsize` means more TPS.

### Alignment Shift (ashift)

For Amazon Elastic Block Store and other cloud stores use the default value. But if you know the
underlying hardware you using you should configure `ashift` properly.

### Disable PostgreSQL full page writes

Because ZFS always writes full blocks you can disable full page writes in PostgreSQL via
`full_page_writes = off` setting.

### ARC and shared_buffers

Since ARC caches compressed blocks it makes sense to use it over PostgreSQL `shared_buffers` for
caching hot data. But making `shared_buffers` too small will negatively affect write speed. Thefore
consider lowering `shared_buffers` as long as your write speed does not suffer too much.

### PostgreSQL block size and WAL size

The default PostgreSQL block size is 8k and it does not match ZFS record size (by default 128k). The
result is that while PostgreSQL writes data in 8k blocks ZFS have to operate with 128k records
(known as write amplification). You can somewhat improve this situation by increasing PostgreSQL
block size to 32k and WAL block size to 64k. This requires re-compiling PostgreSQL and
re-initializing a database.

- Larger `blocksize` considerably improves performance of the queries that read a lot of data (tens
  of megabytes). This effect is not specific to ZFS and you can use larger block sizes with other
  filesystems as well.
- Smaller `blocksize` means more TPS.