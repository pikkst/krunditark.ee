# ADR 0002 — Deterministic Analysis, AI Explanation

- Status: Accepted
- Date: 2026-08-15

## Context

Krunditark operates near legal/regulatory and property decisions. A general-purpose LLM can produce fluent but incorrect or outdated conclusions and cannot be the authoritative engine for parcel-specific buildability.

## Decision

Material findings are generated only from:

1. approved official/authoritative source data;
2. validated normalized facts;
3. PostGIS spatial calculations;
4. verified versioned deterministic rules.

AI is downstream and explanation-only.

The factual Ehituspass must work when AI is disabled or unavailable.

## Required states

Use:

- `clear`
- `condition`
- `conflict`
- `unknown`

Missing/failed evidence must never default to `clear`.

## AI constraints

AI may:

- explain findings;
- summarize approved source text;
- answer evidence-grounded follow-up questions.

AI may not:

- change finding state;
- invent a rule/source/measurement;
- declare official permission;
- convert unknown to allowed.

## Consequences

- More engineering work is required to create source adapters and rules.
- Output is reproducible and testable.
- Legal changes can be versioned.
- AI provider can be changed without altering factual semantics.
- Product can disclose uncertainty honestly.

## Alternatives considered

### RAG + LLM as decision engine

Rejected. Retrieval reduces hallucination risk but does not make model reasoning deterministic or legally authoritative.

### LLM with structured JSON only

Rejected as the factual authority. Output format validation does not prove the underlying conclusion is correct.

## Change policy

Any proposal to let generative AI create authoritative finding states requires a superseding ADR, explicit risk/legal review and a substantially different verification architecture.
