# Analytics Ingestion Pipeline: System Architecture & Delivery Guarantees

This document details the architecture, design decisions, and reliability semantics of the high-throughput analytics ingestion pipeline.

---

## 1. System Data Flow

```mermaid
graph TD
    Client[Analytics SDK / Client] -->|POST /analytics/events| Controller[Analytics Controller]
    Controller -->|1. Validate batch via Zod| Validation{Valid Schema?}
    Validation -->|No| FailResponse[400 Bad Request]
    Validation -->|Yes| Enqueue[2. Enqueue via Redis XADD pipeline]
    Enqueue -->|3. Return 202 Accepted| Client
    
    subgraph Stream Ingestion Channel (Redis)
        Stream[(Redis Stream: analytics-stream)]
    end
    Enqueue -.-> Stream
    
    subgraph Background Processing (NestJS App)
        ConsumerLoop[Consumer Loop: XREADGROUP BLOCK]
        ClaimTimer[Claim Loop: XAUTOCLAIM]
    end
    Stream -.->|Block-read stream| ConsumerLoop
    Stream -.->|Timer-recover dead messages| ClaimTimer
    
    ConsumerLoop -->|4. Parse & check Idempotency| Idempotency{1. Redis SET NX <br> 2. Postgres ProcessedEvent}
    Idempotency -->|Already Processed| Skip[Acknowledge XACK]
    Idempotency -->|Unique Event| Aggregate[5. In-Memory Rollup Aggregation]
    
    Aggregate -->|6. SQL ON CONFLICT DO UPDATE Transaction| RollupTable[(MetricRollup Table)]
    RollupTable -->|7. Successful Flush| Ack[8. Acknowledge stream messages via XACK]
```

---

## 2. Idempotency & De-duplication Strategy

We implement a **two-layer idempotency guard** to ensure that events are never double-counted in rollups:

1. **Redis Hot-Path (Caching Layer):**
   * **Mechanism:** Upon receipt of a message in the consumer loop, we run `SET event-id:<eventId> 1 EX 3600 NX` (1-hour TTL).
   * **Rationale:** This filters out the vast majority of duplicate events (e.g. retries of recent requests) in memory without placing load on the PostgreSQL database.
2. **Postgres Durable Backstop (Storage Layer):**
   * **Mechanism:** We attempt to write the event's UUID to the `ProcessedEvent` table using standard SQL `INSERT INTO ... ON CONFLICT DO NOTHING`.
   * **Verification:** If the database reports `0` affected rows, the event already exists in PostgreSQL (indicating it was processed more than 1 hour ago or escaped the Redis TTL window). We skip aggregating this duplicate event.

---

## 3. Delivery Guarantees & The At-Least-Once Boundary

This pipeline guarantees **at-least-once delivery** of all metrics. We avoid any data loss by design, choosing to process duplicate events (which we filter out) rather than drop events.

### The PEL (Pending Entries List) Boundary

In a Redis Streams consumer group setup, reading a message using `XREADGROUP` moves the message status from the stream into the **Pending Entries List (PEL)** of that specific consumer.

The **At-Least-Once boundary** is defined exactly at the moment **after** a transaction succeeds in PostgreSQL:

1. **Message Consumption:** `XREADGROUP` reads the message. The message is now "unacknowledged" and resides in the PEL. Redis tracks that this consumer has read the message but has not yet confirmed completion.
2. **Crash Scenario A (Pre-Commit):** If the application server crashes or restarts *before* the Postgres transaction completes, the message remains in the PEL. Upon recovery, the message is either re-read by the consumer or claimed by `XAUTOCLAIM` (which acts as a dead-consumer message recovery watch-dog). It will be re-processed.
3. **Database Flush:** The rollup aggregates and unique `ProcessedEvent` rows are committed in a transaction.
4. **Acknowledgment:** ONLY after the transaction succeeds does the consumer call `XACK` on the message IDs.
5. **Crash Scenario B (Post-Commit, Pre-XACK):** If the server crashes *after* the database commit but *before* `XACK` is executed, the message will still be delivered again. However, when it is re-delivered, the **Durable Backstop** (layer 2 idempotency check in Postgres) will catch it as a duplicate and immediately acknowledge (`XACK`) the message without counting it again.

By structuring the acknowledgment boundary *after* the database transaction commits, we ensure **at-least-once delivery** while guaranteeing **exactly-once write semantics** through our dual-layer idempotency.
