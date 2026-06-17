# 12 — Production Status

## AI must know

- **Implemented:** Full mobile JSON app, 19 renderers, actions, request mapper, product/auth APIs, tab shell.
- **Not implemented:** Dedicated renderers per `semanticType` (ProductList, Hero, etc.) — built from primitives instead.
- **Stale docs warning:** Old `docs/PRODUCTION_PROGRESS.md` listed missing ActionDispatcher — **outdated**; dispatcher and mapper exist.
- **Renderer audit (phases 0–11):** Signed off 2026-05-21 — see [`docs/engine/PHASE_REVIEW_2026-05-21.md`](../engine/PHASE_REVIEW_2026-05-21.md). P2 backlog: builder-only props, `image_renderer` DI, image cache.
- **Theme tokens** from JSON `theme` are parsed via `EngineTheme`; some legacy widgets still use `AppThemeModel`.

## Implemented (verified in code)

### Engine

- [x] Tree rendering via `ScreenRenderer` (19 types + unsupported)
- [x] Builder JSON `pages[]` parsing in `AssetVariantRepository`
- [x] `EngineActionDispatcher` — navigate, apiCall, cubitCall (`requestOtp`, `verifyOtp`, `logout`)
- [x] Navigate actions support optional `navigation_type` (`push` vs `go` via `AppNavigation`)
- [x] `EngineRequestMapper` + `VariantScreen` cubit orchestration
- [x] `FormStateStore` + form/textFormField renderers
- [x] `itemBuilder` repeat + `valuePath` / `urlPath`
- [x] Property schema validation (lenient warnings)

### App shell

- [x] `mobile_production_v2` config
- [x] Tab navigation + `shellExcludeRoutes` (non-tab pages full-screen; `shell_route_coverage_test` enforces JSON)
- [x] `TabShellWidget` hides bottom bar on non-tab shell locations and when shell stack can pop
- [x] Dynamic routes with `:productId`, `:categorySlug`
- [x] Auth redirect + token storage

### Features

- [x] Customer OTP auth (`/api/v1/customer/auth/otp/*`)
- [x] Public product catalog, search, autocomplete, categories, detail
- [x] Pagination / load-more for product lists in `VariantScreen`

### Tests

- [x] 88+ engine/config renderer tests; full suite minus stale `widget_test.dart`

## Gaps / limitations

| Area | Status |
|------|--------|
| semanticType-specific renderers | Not separate — use gridView/listView + data binding |
| Theme from JSON (`theme.colors`, typography) | Mostly via `EngineTheme`; legacy `AppThemeModel` widgets remain |
| `gap` in row/column | Supported in parser normalization; verify per layout |
| CI schema validation on JSON | Not enforced in repo |
| Dedicated commerce widgets (cart, checkout forms) | Composed from primitives in JSON only |
| `navigation_type` on lateral navigates | Optional explicit `clear_stack` on ~29 tab-shell taps (default `go` is sufficient) — see [builder-spec 13](../engine/builder-specs/13-navigation-type.md) |
| Web-to-mobile transform layer | Documented in old `Rules.md` — not in this app's runtime |

## JSON configs

| File | Role |
|------|------|
| `mobile_production_v2.json` | Production — **active** |
| `mobile_production.json` | Previous iteration |
| `mobile_component*.json` | Experiments / demos |

Do not reference `classic.json`, `modern.json`, `experimental.json` as active — not in current `assets/config/` listing for production.

## When old docs disagree

Trust this file and live code over:

- `docs/_archive/PRODUCTION_PROGRESS.md`
- `docs/_archive/ENGINE_CURRENT_STATE_FULL_DOCUMENTATION.md`
- Feature guides in `lib/features/` (stubbed)

## Roadmap (suggested)

1. Apply `theme` tokens in renderers consistently
2. CI validation for `schemaVersion` + page structure
3. Renderer/widget tests per component type
4. Reduce legacy hand-built auth views if JSON parity complete

## Related

- [03-engine.md](03-engine.md)
- [09-workflows.md](09-workflows.md)
