# ADR 0005 — Scheduled, Versioned Official-Data Releases

Status: **Accepted**

Date: **2026-08-15**

## Context

Krunditark combines multiple official Estonian data sources: cadastral geometry, restriction zones, planning data, environmental data, legal sources and later additional public registries.

A naive implementation would contact multiple official providers on every user analysis and optionally ask an LLM to retrieve or interpret current information each time.

That approach has unacceptable properties:

- high and unpredictable latency;
- unnecessary load on official public services;
- analysis failures when one upstream service is temporarily unavailable;
- difficult reproducibility;
- repeated parsing and normalization cost;
- potentially high Gemini token cost if AI is used for retrieval/interpretation;
- inconsistent results when upstream data changes between calls inside one analysis.

The product owner explicitly prefers periodic data refresh instead of re-fetching laws, restrictions and related official information for every user request.

## Decision

Krunditark will use **scheduled, versioned internal data releases** as the default authoritative input for analysis.

### Baseline policy

- replicated official datasets are reconciled at least monthly by a server-side scheduled ingestion pipeline;
- Supabase Cron / `pg_cron` is the initial scheduler;
- network ingestion runs through Supabase server-side components/Edge Functions;
- each source produces immutable candidate dataset versions;
- validation and change detection happen before promotion;
- analyses read the latest eligible promoted composite data release;
- a completed analysis stores the exact data release and rule versions used;
- failed refreshes keep the previous verified dataset active;
- legal text changes create review candidates and never automatically rewrite verified deterministic rules;
- ordinary user analyses do not fan out to every government source;
- Gemini is not part of the authoritative monthly refresh pipeline.

### Live-source exceptions

A source may remain a live lookup only when there is a documented reason such as:

- current real-time state is necessary;
- replication/storage is prohibited or unsuitable;
- the information is inherently request-specific;
- no stable bulk/snapshot mechanism is available.

Such exceptions require an explicit source policy and must not become an accidental fallback.

## Consequences

### Positive

- predictable user latency;
- materially lower upstream/API and AI cost;
- analyses remain usable during temporary source outages;
- exact historical reproducibility;
- easier GIS indexing and batch analysis;
- explicit freshness and source-health semantics;
- legal/rule review can be separated safely from raw document changes.

### Negative

- Krunditark must operate an ingestion pipeline;
- storage usage increases because versions/history are retained;
- freshness is bounded by the selected schedule unless a manual/emergency refresh occurs;
- source schema changes require operational monitoring;
- large national spatial datasets may require batching and lifecycle management.

These costs are accepted because they materially improve reliability and trustworthiness.

## Rejected alternatives

### Fetch every source per analysis

Rejected because of latency, reliability, provider load, inconsistent snapshots and repeated processing.

### Ask Gemini to search current information for every analysis

Rejected because the LLM is not an authoritative legal/GIS source, introduces token cost and cannot provide deterministic reproducibility.

### Store one mutable “current” copy without versions

Rejected because historical Ehituspass results would no longer be reproducible and source changes could silently alter the meaning of past analyses.

### Automatically convert changed legal text into production rules

Rejected because legal text changes require controlled interpretation, deterministic implementation, tests and verification.

## Implementation notes

See:

- `docs/DATA_REFRESH_AND_VERSIONING.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SOURCES.md`
- `docs/DATABASE_SCHEMA.md`

The initial expected schedule is a monthly full reconciliation, with source-specific manual or higher-frequency metadata checks allowed when documented.

This ADR must be superseded explicitly if the project later changes to primarily live upstream analysis.
