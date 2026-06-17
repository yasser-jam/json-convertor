# 05 — Core Infrastructure

## AI must know

- **DI:** `setupServiceLocator` in `lib/core/utils/service_locator.dart` — call after `AppConfigLoader.load`.
- **Router:** `AppRouter.setupRouter` builds routes from `MobileAppConfig` — every page → `VariantScreen`.
- **Network:** `Dio` + `AuthInterceptor` + `NetworkConfig` (base URL, tenant from JSON `app`).
- **Tokens:** `TokenCubit` + `FlutterAuthTokenStorage` — session for customer auth.

## Startup sequence

1. `AppConfigLoader.load(variantId)` → `MobileAppConfig?`
2. `setupServiceLocator(networkConfig:, mobileAppConfig:)`
3. `SharedPreferencesCubit.setup()`, `TokenCubit.fetchSavedToken()`
4. `AppRouter.setupRouter(tokenCubit:, mobileConfig:)`
5. `runApp(SOOQApp(router:))`

## Service locator registrations

| Type | Lifetime | Notes |
|------|----------|-------|
| `NetworkConfig` | singleton | From JSON apiBaseUrl + tenant |
| `AuthTokenStorage` | singleton | Secure storage |
| `TokenCubit` | singleton | |
| `SharedPreferencesCubit` | singleton | |
| `Dio` | singleton | AuthInterceptor attached |
| `ApiService` | singleton | |
| `AuthRepo` / `AuthCubit` | singleton | |
| `ProductRepo` | singleton | |
| `ProductCubit`, `ProductSearchCubit`, etc. | factory | New instance per provider |
| `VariantRepository` | singleton | `AssetVariantRepository` |

Access: `getIt<T>()` from `service_locator.dart`.

## Routing

- `lib/core/utils/app_router.dart`
- Tab shell: `ShellRoute` + `TabShellWidget` for routes not in `shellExcludeRoutes`
- Excluded routes: standalone `GoRoute` → `VariantScreen`
- Fallback: `HomeScreen` at `/mvp2` when no mobile config

`VariantScreen` receives: `variantId`, `pageRoute`, `routeParams`, `queryParams`, `mobileAppConfig`.

## Auth

- `AuthInterceptor` — attaches bearer token; refresh/logout on 401
- `AuthRedirect` — redirect unauthenticated users from protected routes
- `auth_redirect.dart`, `token_refresh_listenable.dart`

Public product APIs: **no** `Authorization` header (`/api/v1/public/*`).

## Tenant

- `tenantId` / `tenantSlug` from JSON `app` section
- `TenantResolver` adds query/header where required for public endpoints

## Shared widgets (legacy / hybrid)

Some flows still use hand-built widgets:

- `lib/core/widgets/` — `PrimaryButton`, `BottomNavBar`, `TopBar`, `TextComponent`
- Auth onboarding may use `features/auth/presentation/views/` alongside JSON routes

Prefer JSON for new merchant-facing screens.

## Logging

- `AppLogger` in `lib/core/utils/app_logger.dart` — debug/auth/network channels

## Constants

- `lib/core/utils/constants.dart` — colors, keys used outside JSON theme

## In-app user messages (`AppMessenger`)

Centralized **top-of-screen** transient feedback (not Firebase push notifications).

| Item | Detail |
|------|--------|
| File | `lib/core/feedback/app_messenger.dart` |
| Entry | `AppMessenger.show(context, AppMessage(...))`, `showError`, `showSuccess`, … |
| Kinds | `error`, `success`, `info`, `warning` |
| UI | Single overlay card under status bar; slide-in; auto-dismiss; tap to dismiss |
| Theme | `EngineTheme` / `Theme.of(context)` first; fallback `constants.dart` |

**Call from:** feature `BlocListener`s, `VariantScreen` auth host, optional `EngineActionDispatcher` on invalid form — **never** from `lib/engine/tree/renderers/`.

**Do not use:** `ScaffoldMessenger.showSnackBar`, bottom `SnackBar`.

**Not for:** inline list/grid load errors — those use `requests.{requestKey}` + `request_ui_state.dart`.

**Auth example** (`variant_screen.dart` → `_AuthRequestHost`):

- `AuthFailureState` → `AppMessenger.showError`
- `AuthOtpRequested` → `AppMessenger.showSuccess` or `showInfo`
- Optional `AuthAuthenticated` welcome using `tokenResponse.username`

**Future JSON:** `tap: { type: showMessage }` requires `docs/engine/builder-specs/` handoff per RULES §3.4.

Authoritative rules: [RULES.md §3.10](../../RULES.md#310-in-app-user-messages-appmessenger).

## Related

- [06-feature-auth.md](06-feature-auth.md)
- [01-architecture.md](01-architecture.md)
