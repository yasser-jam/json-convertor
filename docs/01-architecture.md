# 01 — Architecture

## AI must know

- **Four layers:** Config → Engine → Core → Features. Violations (business logic in engine, JSON parsing in widgets) are invalid.
- **UI changes** → edit `assets/config/{variant}.json`, not new `StatelessWidget` screens.
- **API/data** → feature repos/cubits; **binding to UI** → `VariantScreen` populates `dataContext` from cubit state; renderers read paths like `valuePath` / `urlPath`.

## Layer boundaries

### Config (`lib/config/`)

- Models: `ComponentConfig`, `ScreenConfig`, `MobileAppConfig`, `NavigationConfig`
- No `import 'package:flutter/...'` for rendering decisions
- Single source of truth for *what* the app contains

### Engine (`lib/engine/`)

- `ScreenRenderer` — recursive widget build from `ComponentConfig`
- `AssetVariantRepository` (in features) parses page JSON → `ScreenConfig`
- `EngineActionDispatcher` — `tap` → navigate / apiCall / cubitCall
- `EngineRequestMapper` — scans tree for `data.requestUrl` blocks
- **No** product/auth domain rules — only generic interpretation

### Core (`lib/core/`)

- `ApiService`, `Dio`, `AuthInterceptor`, `TokenCubit`
- `AppRouter` — builds `GoRouter` from `MobileAppConfig`
- Reusable widgets (`PrimaryButton`, `BottomNavBar`, etc.) — config-agnostic

### Features (`lib/features/`)

- `auth`, `product`, `variantscreen`, `shell`, `homescreen`
- Repos + cubits + optional legacy hand-built views (`onboarding_view`, `auth.dart`)
- Must not change how `ScreenRenderer` maps types

## Runtime data flow

```
main()
  → AppConfigLoader.load('mobile_production_v2')
  → MobileAppConfig
  → setupServiceLocator(networkConfig from app.apiBaseUrl, tenant)
  → AppRouter.setupRouter(mobileConfig)
  → GoRoute → VariantScreen(variantId, pageRoute, routeParams)
       → VariantCubit loads page from same JSON file
       → EngineRequestMapper.collectRequests(root)
       → Product/Category/Search cubits fetch → _requestResults
       → ScreenRenderer.render(ScreenConfig, dataContext)
       → Flutter UI
```

## Data binding contract

1. **Static text/images** — `props.value`, `props.url` in JSON.
2. **Dynamic fields** — `props.valuePath`, `props.urlPath` (e.g. `item.name`) resolved against `dataContext` in renderers.
3. **Collections** — `itemBuilder` with `source: "dataContext.requests.{requestKey}.data"` and `type: "repeat"`.
4. **Route params** — `dataContext.routeParams` from `GoRouter`; actions resolve `:productId` etc.

Engine does not call APIs directly for product lists — `VariantScreen` orchestrates cubits after `EngineRequestMapper` identifies needed requests.

## Auth vs public routes

- `shellExcludeRoutes` in JSON lists routes **outside** tab shell (splash, auth, checkout, product detail).
- `AuthRedirect` + `TokenCubit` gate protected routes (see `05-core.md`).

## Design principles

| Principle | Enforcement |
|-----------|-------------|
| Data-driven UI | JSON owns layout |
| Separation | Features ≠ Engine |
| Scalability | New merchant = new JSON, same binary |
| Lenient schema warnings | Typos warn; structural errors fail parse |

## Related

- [02-config-and-json.md](02-config-and-json.md)
- [03-engine.md](03-engine.md)
- [08-feature-variant-shell.md](08-feature-variant-shell.md)
