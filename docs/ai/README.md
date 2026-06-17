# SOOQ Merchant — AI Documentation Index

Canonical documentation for humans and AI assistants. **Read `AGENTS.md` at repo root first.** Mandatory standards: [`RULES.md`](../../RULES.md).

## Quick navigation

| Doc | When to read |
|-----|----------------|
| [00-overview.md](00-overview.md) | Project identity, glossary, non-goals |
| [01-architecture.md](01-architecture.md) | Layers, boundaries, data binding |
| [02-config-and-json.md](02-config-and-json.md) | JSON schema, pages, navigation, `data` blocks |
| [03-engine.md](03-engine.md) | Renderers, parsing, validation |
| [04-actions-and-requests.md](04-actions-and-requests.md) | `tap`, `EngineActionDispatcher`, `EngineRequestMapper` |
| [05-core.md](05-core.md) | DI, router, network, auth tokens, `AppMessenger` |
| [06-feature-auth.md](06-feature-auth.md) | OTP auth, cubits, endpoints |
| [07-feature-product.md](07-feature-product.md) | Catalog, search, categories |
| [08-feature-variant-shell.md](08-feature-variant-shell.md) | Dynamic pages, tab shell |
| [09-workflows.md](09-workflows.md) | How to add component, API, screen |
| [10-file-index.md](10-file-index.md) | Full `lib/` file map |
| [11-testing.md](11-testing.md) | Test layout and patterns |
| [12-production-status.md](12-production-status.md) | Implemented vs gaps |
| [13-ui-refactor-v2-summary.md](13-ui-refactor-v2-summary.md) | Production v2 JSON UI refactor changelog |
| [../engine/web-to-mobile-converter/README.md](../engine/web-to-mobile-converter/README.md) | Web → mobile JSON converter rules (Erteqa Puck → SDUI) |

## Cursor integration

- **Always on:** `AGENTS.md` + `RULES.md` + `.cursor/rules/sooqrules.mdc`
- **Auto by path:** `engine.mdc`, `config.mdc`, `core.mdc`, `features-*.mdc`

## Active runtime

- Config: `mobile_production_v2` (`lib/main.dart`)
- Asset: `assets/config/mobile_production_v2.json`

## Deprecated docs

Old `docs/*.md` (except this tree) and `lib/features/*/Customer*Guide.md` are stubs pointing here.
