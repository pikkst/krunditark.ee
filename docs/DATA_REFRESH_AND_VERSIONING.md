# Data Refresh and Versioning — Compatibility Notice

This document has been **superseded** by the canonical specification:

- [`DATA_REFRESH_AND_CACHE.md`](./DATA_REFRESH_AND_CACHE.md)

Do not implement refresh/version behavior from an older revision of this file.

The canonical policy now defines:

- source-specific refresh classes instead of a universal monthly rule;
- monthly/periodic heavy spatial releases;
- lightweight daily/weekly legal/source change watches;
- EHR incremental `changed-after` synchronization where appropriate;
- In-AKS live/short-cache address lookup;
- versioned source dataset promotion;
- immutable composite data releases;
- last-known-good/stale behavior;
- deterministic analysis and Gemini explanation caching;
- historical report reproducibility.

This compatibility file remains only because earlier project documentation/links may still reference its old name. New documentation and implementation must reference `DATA_REFRESH_AND_CACHE.md`.
