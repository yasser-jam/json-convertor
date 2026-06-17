# 08 — Variant Screen and Shell

## AI must know

- **Every config route** renders through `VariantScreen` — the dynamic page host.
- `VariantCubit` loads one page from the **same** JSON file as `MobileAppConfig`.
- `VariantScreen` is the **orchestrator** for cubits, `dataContext`, and `ScreenRenderer` — largest integration point.
- `TabShellWidget` wraps tab routes only; excluded routes are full-screen.

## Variant loading

### Repository

`lib/features/variantscreen/data/repos/variant_repository.dart`

- Interface: `VariantRepository`
- Implementation: `AssetVariantRepository`
- Loads `assets/config/{variantId}.json`
- Selects page by `pageRoute` (preferred) or page `id`
- Builds `ScreenConfig` with scaffold root (appBar + body normalization)

### Cubit

`VariantCubit` states: `VariantLoading`, `VariantSuccess(ScreenConfig)`, `VariantFailure`.

## VariantScreen responsibilities

File: `lib/features/variantscreen/presentation/views/variant_screen.dart`

1. Load screen config via `VariantCubit`
2. `EngineRequestMapper.collectRequests` on success
3. Provision cubits (`ProductCubit`, `CategoryCubit`, …) based on mapped requests
4. Fetch data → populate `_requestResults` / `dataContext`
5. Handle load-more for product lists (`_loadingMoreRequestKeys`)
6. Auth routes: optional `AuthCubit` providers
7. Call `ScreenRenderer.withPrimitives().render(config, context:, dataContext:)`

### dataContext keys

| Key | Content |
|-----|---------|
| `FormStateStore.contextKey` | Form fields |
| `EngineActionDispatcher.contextKey` | Tap handler |
| `routeParams` | Path parameters |
| `requests.{key}` | API results |
| `item` | Current repeat item (during itemBuilder) |

## Tab shell

`lib/features/shell/presentation/views/tab_shell_widget.dart`

- Reads `NavigationConfig` from `MobileAppConfig`
- Bottom navigation for `navigation.tabs`
- Child route content from shell `GoRoute` builders

## Router wiring

`AppRouter.setupRouter`:

- `shellExcludeRoutes` → top-level `GoRoute` (no bottom bar)
- Tab routes + `nonTabRoutes` → inside `ShellRoute`
- Each builder → `_buildVariantScreen(variantId: mobileConfig.variantId, pageRoute: route, ...)`

## homescreen (legacy)

`lib/features/homescreen/presentation/views/home_screen.dart` — fallback at `/mvp2` when config missing. Not used in production tab flow.

## Debugging dynamic pages

1. Confirm route exists in `pages[].route`
2. Check `variantId` matches `main.dart` `_kActiveConfig`
3. Log `[ScreenRenderer]` / `[RequestMapper]` debug lines
4. Verify `requestUrl` matches a mapper-supported pattern
5. Inspect cubit state in `VariantScreen` build when blank lists

## Related

- [03-engine.md](03-engine.md)
- [02-config-and-json.md](02-config-and-json.md)
- [05-core.md](05-core.md)
