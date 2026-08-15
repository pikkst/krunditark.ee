# ADR 0004 — Google Gemini as Initial AI Provider

- Status: Accepted
- Date: 2026-08-15

## Context

Krunditark needs an AI layer for plain-language Estonian explanations, evidence-grounded follow-up questions and later optional document/multimodal assistance.

The factual buildability analysis is already defined as deterministic and independent from AI.

The project owner selected **Google Gemini API** as the initial production AI provider.

## Decision

Use Google Gemini API for Krunditark AI features.

Implementation requirements:

- use Google's current supported Gemini API / Google GenAI SDK at implementation time;
- JavaScript/TypeScript integration should follow the current official Google AI SDK direction rather than deprecated SDKs;
- store the API credential as `GEMINI_API_KEY` in Supabase Edge Function/server secrets;
- configure the selected model using `KRUNDITARK_GEMINI_MODEL`;
- Gemini calls execute only server-side;
- keep a Krunditark-owned `ExplanationProvider` interface so Google SDK types do not enter GIS/rules/domain code;
- use structured response/schema support where appropriate and independently validate output;
- normal automated tests use a deterministic fake provider;
- Gemini failure must degrade to deterministic template explanations rather than fail the factual analysis.

Official implementation references:

- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/migrate

## Why the provider abstraction remains

Provider abstraction does **not** mean an implementation agent may choose another provider.

It exists because:

- Google SDK APIs can change;
- Gemini model IDs and capabilities evolve;
- unit tests need a fake implementation;
- core regulatory/GIS logic must remain independent from generative AI infrastructure.

Changing production provider requires an explicit project-owner decision and a superseding/new ADR.

## Security consequences

`GEMINI_API_KEY` must never be:

- committed to Git;
- stored in `.env.example` as a real value;
- prefixed with `VITE_`;
- sent to the browser;
- embedded in GitHub Pages artifacts;
- printed in logs or test snapshots.

Use separate non-production and production credentials when operational setup permits it.

## Product consequences

Gemini may:

- explain completed structured findings;
- summarize approved supplied evidence;
- answer project questions within the supplied analysis context;
- later assist with candidate extraction from documents under a separately approved workflow.

Gemini may not:

- decide whether building is legally allowed;
- invent legal thresholds or GIS measurements;
- browse/search independently for authoritative project-specific facts in MVP;
- convert `unknown` or `condition` into `clear`;
- create official-looking approvals.

## Model selection

This ADR intentionally does not permanently name a specific Gemini model.

Model selection is operational configuration because Google model availability and recommendations change. Before a release changes the configured model:

1. verify current official Google documentation;
2. run structured-output tests;
3. run prompt-injection/adversarial tests;
4. verify latency/cost limits;
5. verify privacy/data-handling requirements;
6. record the model used in deployment/release metadata.

## Rejected alternatives

### Gemini directly from the browser

Rejected because the API key would be exposed to an untrusted static client.

### Gemini as the buildability decision engine

Rejected by ADR 0002 because material findings require reproducible official evidence, GIS calculations and verified deterministic rules.

### Hard-code Gemini SDK throughout the application

Rejected because it couples domain logic and tests to provider-specific infrastructure.
