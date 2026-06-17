# 00 — Project Overview

## AI must know

- This is a **Flutter-based dynamic mobile app generator**, not a traditional hand-coded Flutter app.
- **UI structure lives in JSON** (`assets/config/*.json`). Dart changes are for engine capabilities, core primitives, and business features only.
- **One codebase** serves multiple merchant apps via different config files — never per-merchant UI branching in Dart.
- Active config: **`mobile_production_v2`** (see `lib/main.dart` constant `_kActiveConfig`).

## What this project is

SOOQ Merchant Mobile interprets declarative JSON into Flutter widgets at runtime. Merchants customize screens, navigation, and styling through configuration. Flutter is the rendering runtime.

## What this project is not

- Not a template app with swapped colors
- Not a page builder where every screen is a separate Dart widget file
- Not a place to hardcode product lists, checkout flows, or auth screens per merchant

## Glossary

| Term | Meaning |
|------|---------|
| **Config / variant** | JSON file id (e.g. `mobile_production_v2`) — loaded from `assets/config/{id}.json` |
| **MobileAppConfig** | Top-level parsed app: navigation, routes, API base URL, tenant |
| **Page** | One route's UI definition inside `pages[]` |
| **ComponentConfig** | Tree node: `type`, `props`, `child`/`children`, optional `itemBuilder` |
| **semanticType** | Metadata in `props` — hints intent (e.g. `ProductList`); does not add a renderer by itself |
| **dataContext** | Runtime map passed to renderers (API results, route params, form state) |
| **requestKey** | Id for a data fetch block (e.g. `product-list`) — wired by `VariantScreen` + cubits |
| **VariantScreen** | Host widget that loads a page JSON slice and renders via `ScreenRenderer` |

## Layer summary

| Layer | Path | Responsibility |
|-------|------|----------------|
| Config | `lib/config/` | Pure data models — no Flutter |
| Engine | `lib/engine/` | JSON → widgets; actions; request mapping |
| Core | `lib/core/` | DI, network, router, shared widgets |
| Features | `lib/features/` | Auth, product APIs, variant loading — isolated from UI generation |

## Non-goals

- Hardcoding screens or navigation in Dart when JSON can express it
- Business logic inside renderers or `ScreenRenderer`
- Duplicating UI per merchant in feature or engine code
- Treating `semanticType` as a second component registry without engine support

## Related

- [01-architecture.md](01-architecture.md) — boundaries and data flow
- [AGENTS.md](../../AGENTS.md) — entry point for every prompt
