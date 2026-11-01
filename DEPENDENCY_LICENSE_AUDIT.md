# Dependency license metadata audit

**Snapshot reviewed:** `package-lock.json`  
**Scope:** npm package metadata recorded in the committed lockfile; this is not a legal opinion or a complete asset-rights review.

## Inventory

The lockfile contains 281 package entries under `packages`. Every entry has a declared license field in the inspected snapshot.

| Declared license metadata | Package entries |
|---|---:|
| MIT | 243 |
| ISC | 26 |
| Apache-2.0 | 5 |
| BSD-3-Clause | 3 |
| CC-BY-4.0 | 1 |
| 0BSD | 1 |
| MIT AND ISC | 1 |
| (MPL-2.0 OR Apache-2.0) | 1 |

## Python dependencies

The backend uses `backend/requirements.txt`, which is not represented by a resolved Python lockfile in this audit. Its transitive dependency versions and license metadata remain unverified.

## Follow-up

1. Generate a reproducible Python dependency lock and license inventory.
2. Verify any third-party icons, fonts, templates, and other assets independently.
3. Regenerate this report whenever the npm lockfile changes.

**Limitations:** a declared package license field is a lead for review, not proof that all required notices are present or that the project has satisfied every license obligation.
