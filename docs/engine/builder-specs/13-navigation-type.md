# Builder spec: Navigation type (push vs clear stack)

> **Phase:** Navigation phases 2–5  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-22  

---

## Summary

The mobile engine supports optional **`navigation_type`** on JSON actions with `"type": "navigate"`. It controls whether the app uses GoRouter **`context.push`** (stacked route, AppBar back works) or **`context.go`** (replace stack / “clear stack”). The website builder must be able to author this field on **node `tap`**, **`cubitCall` `onSuccess` / `onFailure`**, and **timer `tap`** navigate actions.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `navigation_type: push` on product detail | Yes | **8** taps to `/product/details/...` (grids, search, wishlist) |
| `navigation_type: clear_stack` on reset flows | Yes | Splash timer/tap, carousel CTA, auth `onSuccess`, checkout/order completion |
| `navigation_type` on logout | Yes | `settings-logout` `onSuccess` ~3593 |
| Navigate taps without `navigation_type` | Yes (default `go`) | **~29** lateral/tab-shell navigates (home, profile, checkout steps, etc.) |

---

## Builder requirements

### 1. Navigate action — `navigation_type`

**Applies to:** any action object with `"type": "navigate"`:

- Component/node **`tap`**
- **`cubitCall`** nested **`onSuccess`** / **`onFailure`**
- **`timer`** **`tap`** (full action map)

**JSON shape (authoritative):**

```json
{
  "type": "navigate",
  "route": "/product/details/:productId",
  "navigation_type": "push"
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `type` | string | yes | — | Must be `navigate` |
| `route` | string | yes | — | Path; supports `:param` placeholders |
| `navigation_type` | string | no | `clear_stack` (`context.go`) | Stack behavior (see alias table) |
| `requireValidForm` | bool | no | false | Validate `formId` before dispatch |
| `formId` | string | no | — | Form id when `requireValidForm` is true |

**`navigation_type` values** (case-insensitive; trim whitespace):

| Author value | Aliases | Mobile API | Use when |
|--------------|---------|------------|----------|
| _(omit)_ | — | `context.go` | Default — auth success, splash, logout landing, tab-like flows |
| `clear_stack` | `clearstack`, `reset`, `go` | `context.go` | Same as omit — reset navigation stack |
| `push` | `stack` | `context.push` | Drill-down (e.g. list → product detail); user can go back via AppBar |

Unknown values → treated as `clear_stack`.

**Validation rules for builder:**

- Only valid on `type: navigate` (not on `apiCall` / `cubitCall` root).
- `route` must match a `pages[].route` or dynamic pattern the app registers (e.g. `/product/details/:productId`).
- For list/card taps, ensure `item` / `routeParams` binding matches existing `:param` names.

**Pages / flows to wire first (suggested — aligns with mobile Phase 7 migration):**

| Flow | Route(s) | `navigation_type` |
|------|----------|-------------------|
| List/grid → product detail | `/product/details/:productId` | `push` |
| Splash, carousel → next | `/splash-carousel`, `/auth/login`, … | `clear_stack` or omit |
| OTP verify → home | `/home` on `verifyOtp` `onSuccess` | omit or `clear_stack` |
| Settings logout | `/auth/login` on `logout` `onSuccess` | `clear_stack` (**in repo**) |
| Tab bar | tab routes | N/A — shell uses `go` in `TabShellWidget`, not `tap` |
| Profile / home links → `/products`, `/settings`, `/orders`, … | those routes | `push` or omit (`go`) — route must be in **`shellExcludeRoutes`** |
| Cart → checkout | `/checkout` | omit or `clear_stack` — already in **`shellExcludeRoutes`** |

### Shell vs `navigation_type` (bottom bar)

Two separate JSON/router concerns:

| Config | Controls |
|--------|----------|
| `navigation.shellExcludeRoutes` | Page is **outside** `ShellRoute` → no `TabShellWidget` / bottom bar (e.g. `/checkout`, `/products`, `/settings`) |
| `navigation_type` on `navigate` | `push` = stack + AppBar back; omit / `clear_stack` = `context.go` |

| Author intent | `shellExcludeRoutes` | `navigation_type` |
|---------------|----------------------|-------------------|
| Full-screen drill-down (list → detail, profile → settings) | **Include** route | `push` when back is needed |
| Reset flow (splash, logout, order success → home) | Include if non-tab | `clear_stack` or omit |
| Switch to a **tab** (same as tapping bottom nav) | **Do not** exclude tab route | omit or `clear_stack` (`go`) — **never `push`** (duplicate Navigator page key on `/cart`, `/home`, etc.) |
| Tab screen linked from another tab **with back + no bottom bar** | Add alias route in **`shellExcludeRoutes`** + **`routeAliases`** (e.g. `/categories/browse` → `/categories`) + `navigation_type: push` — see prod `home-categories-more` |

**Do not combine** alias drill paths with direct `push` to a tab `route` (e.g. `/cart`). Aliases are for alternate URLs that load the same `pages[].route` content outside the shell stack; tab switches use the tab `route` with `clear_stack` only.

Production `mobile_production_v2` excludes: `/products`, `/orders`, `/settings`, `/wishlist`, `/notifications`, `/support`, checkout/order/auth/detail routes, etc. Tab routes (`/home`, `/categories`, `/search`, `/cart`, `/profile`) remain in the shell.

---

### 2. Logout — `cubitCall` + navigate `onSuccess`

**Reference in prod JSON** (`settings-logout`):

```json
"tap": {
  "type": "cubitCall",
  "cubit": "auth",
  "method": "logout",
  "onSuccess": {
    "type": "navigate",
    "route": "/auth/login",
    "navigation_type": "clear_stack"
  }
}
```

Builder must support **`method: "logout"`** on auth `cubitCall` (clears token, then runs `onSuccess`). Do **not** use navigate-only logout without clearing session.

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Parser / navigate | `lib/core/navigation/app_navigation.dart` | `parseNavigationType`, `AppNavigation.navigate` |
| Dispatch | `lib/engine/actions/action_dispatcher.dart` | `_handleNavigate` reads `navigation_type` |
| Schema notes | `lib/engine/validation/component_schemas.dart` | `navigateActionPropertyTypes` |
| Tab shell | `lib/features/shell/presentation/views/tab_shell_widget.dart` | Bottom bar only on exact tab routes when shell stack depth is 1 |
| Router | `lib/core/utils/app_router.dart` | `shellExcludeRoutes` → top-level; tabs → `ShellRoute` + `navigatorKey` |
| AppBar back | `lib/engine/tree/renderers/app_bar_renderer.dart` | `context.canPop()` / `context.pop()` (works with `push`) |
| Auth toast | `lib/features/variantscreen/presentation/views/variant_screen.dart` | Success toast only on login — **no** duplicate `go` to `/home` |

No Dart changes required on builder side for this spec — informational.

---

## Example: before / after

**Before (navigate only — still valid, default clear stack):**

```json
"tap": {
  "type": "navigate",
  "route": "/product/details/:productId"
}
```

**After (product card — target for Phase 7):**

```json
"tap": {
  "type": "navigate",
  "route": "/product/details/:productId",
  "navigation_type": "push"
}
```

**Logout (implemented in repo):**

```json
"tap": {
  "type": "cubitCall",
  "cubit": "auth",
  "method": "logout",
  "onSuccess": {
    "type": "navigate",
    "route": "/auth/login",
    "navigation_type": "clear_stack"
  }
}
```

---

## Acceptance (builder done when)

- [ ] Builder UI can set `navigation_type` on navigate actions (dropdown: push / clear stack + aliases documented)
- [ ] Builder exports `logout` cubitCall + `onSuccess` navigate for settings
- [ ] Exported JSON includes `push` on agreed product-detail taps (Phase 7 rollout)
- [ ] Mobile app: detail back returns to list; logout stays on login without bounce to home

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-22 | | Initial spec — engine Phases 1–4; partial prod JSON (logout only) |
| 2026-05-22 | | Phase 7 — prod JSON: 8 `push` on product detail; `clear_stack` on splash/auth/checkout |

---

## Related

- [NAVIGATION_IMPLEMENTATION_PHASES.md](../NAVIGATION_IMPLEMENTATION_PHASES.md) — Phase 7 JSON migration table
- [docs/ai/04-actions-and-requests.md](../../ai/04-actions-and-requests.md)
- [RULES.md](../../../RULES.md) §2.3 Navigation
