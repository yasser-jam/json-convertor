# Converter Output Spec — Verification & Delta Review (round 3)
**Date:** 2026-07-05  
**Reviewing:** `CONVERTER-OUTPUT-SPEC.md` version **2026-07-03** (the revision made after `CONVERTER-SPEC-REVIEW-2026-07-03.md`)  
**Verified against:** current engine source — `action_dispatcher.dart`, `property_parsers.dart`, all renderers, `component_schemas.dart`, `variant_config_parser.dart`, `assets/config/mobile_production_v2.json`, and builder specs 30–35.

> Addressed to the **web developer**. Part 1 confirms your fixes — the spec is in very good shape now. Part 2 has **3 real errors** (two produce broken taps at runtime) plus 2 doc-internal contradictions. Part 3 covers **engine features added 2026-07-04** that the spec doesn't know about yet (`switchField`, appBar gradient, radioGroup remove-item, checkout address flow).

---

## Part 1 — Confirmed fixed ✅

All points from the 2026-07-03 review are correctly applied:

| Point | Where fixed | Verified against engine |
|-------|-------------|------------------------|
| `contactButton` example now has `props.target` + node-level `tap` | §6.5b | ✅ matches renderer requirement |
| Link emits `variant: "text"` (no literal `ghost`) | §6.6 | ✅ |
| `button.height` — omit for `md`, never on `contactButton` | §6.5 note, checklist | ✅ engine support shipped (builder spec 33) |
| §6.21 Stats heading restored | §6.21 | ✅ |
| §12 duplicate rows removed; `w600` note moved to §6.2 | §6.2, §12 | ✅ |
| `radioGroup` documented | §6.30, §2 | ✅ |
| `openBottomSheet`/`closeBottomSheet` + snapshot note | §4 G2 | ✅ |
| `pages[].footer` + sticky-CTA hard rule + SiteFooter mapping | §7 | ✅ |
| `visibleWhen` documented | §6.31 | ✅ |
| Dashed divider, trailingText(Path), stack positioning | §6.9, §6.5, §6.12 | ✅ |

**Also verified — your new additions are correct:**
- `replaceCurrent` on `openBottomSheet` — real (`action_dispatcher.dart:356`) ✅
- `footer.overlay: true` + end-of-body spacer rule — real (parser strips `overlay` at `variant_config_parser.dart:146`) ✅
- Per-corner `borderRadius: { topLeft, topRight, ... }` in the footer example — supported by `parseBorderRadius` ✅
- The §35 shell-route warning applies to you too: **any new non-tab route must appear in both `pages[]` AND `navigation.shellExcludeRoutes`** — a route missing from `shellExcludeRoutes` crashes with a duplicate-page-key assert when pushed from another shell-excluded page. Your §7 `shellExcludeRoutes` list must be generated from the merchant's actual non-tab pages, not copied verbatim.

---

## Part 2 — Errors in the revised spec

---

### 🔴 E1 — `cartQtyIncrease` / `cartQtyDecrease` call cart methods that DON'T EXIST

**Your §6.5 mapping:**
```json
{ "type": "cubitCall", "cubit": "cart", "method": "increaseQuantity",
  "params": { "lineId": { "source": "data", "field": "lineId" } } }
```

**Verified** (`action_dispatcher.dart:747-779`): the cart cubitCall switch supports exactly these methods — `addItem`, `updateQuantity`, `removeItem`, `clear`, `assertNotEmpty`. `increaseQuantity`/`decreaseQuantity` hit the default case → logged as "Unsupported cart method" and **nothing happens**. Also the param key is `variantId`, not `lineId`.

**Correct mapping** — `updateQuantity` takes `quantity` (absolute) **or** `delta` (relative). For plus/minus buttons inside a cart line template:

```json
{
  "type": "cubitCall", "cubit": "cart", "method": "updateQuantity",
  "params": {
    "variantId": { "source": "item", "field": "variantId" },
    "delta": { "source": "value", "value": 1 }
  }
}
```
`cartQtyDecrease` → same with `"value": -1`. `source: "item"` reads the current repeat-item (cart line) from the template context. Remove-line → `method: "removeItem"` with the same `variantId` param.

---

### 🔴 E2 — `{ "source": "data" }` is not a valid cubitCall param source

**Verified** (`action_dispatcher.dart:1115-1184`) — the complete param-source vocabulary:

| `source` | Reads from |
|----------|-----------|
| `form` | FormStateStore field |
| `tap` | The tap payload (radioGroup/dropdown/tabs selection) |
| `item` | Current repeat-item in a list/grid template |
| `dataContext` / `context` | Any dataContext path in `field` |
| `pageState` / `page_state` | PageStateStore key |
| `routeParams` / `route_params` | Route parameters |
| `authState` | Auth session field |
| `app` | `app.*` config values (e.g. supportWhatsApp) |
| `value` | Literal: `{ "source": "value", "value": 1 }` |

**`data` is not in the list** — unknown sources fall through to `spec['value']`, i.e. **null**. 

**⚠️ Naming trap to document:** `visibleWhen` accepts `source: "data"` (its own vocabulary: `form` | `pageState` | `data`/`dataContext`), but **cubitCall params do not** — there use `dataContext`, `item`, or `tap`. Two different vocabularies; don't reuse one in the other.

---

### 🔴 E3 — §9.5 `labelPath` (button) and `semanticsLabelPath` (image) are not engine props

**Your §9.5 mapping table claims:**
- `altValueContext` → `semanticsLabelPath` on image
- `labelValueContext` on button → `labelPath`

**Verified:** zero occurrences of either prop in the engine. `image` reads only static `semanticsLabel`/`alt`; `button` reads only static `label`. (`itemLabelPath` exists, but only on `dropdown`/`radioGroup`/`tabs` for their internal item lists — it is not a general button prop.) Emitting these produces buttons with empty labels inside repeat templates.

**Options:**
1. **Workaround now:** for dynamic text in templates use a `text` node with `valuePath` (fully supported) next to or instead of a bound button label; keep button labels static ("أضف للسلة", "عرض").
2. **Engine addition:** if bound button labels / image a11y labels are genuinely needed for the commerce presets, ask us — same as `button.height`, we can add `labelPath`/`semanticsLabelPath` quickly. Until we confirm, **do not emit them**.

---

### 🟡 E4 — `verifyOtp` mapping is incomplete

`verifyOtp` exists (`action_dispatcher.dart:692`), but your row `{ "type": "cubitCall", "cubit": "auth", "method": "verifyOtp", "requireValidForm": true }` omits the params and formId the flow needs. Production-verified shape (`mobile_production_v2.json` `/auth/otp-reset`):

```json
{
  "type": "cubitCall", "cubit": "auth", "method": "verifyOtp",
  "requireValidForm": true, "formId": "otp-verify-form",
  "params": { "phone": { "source": "authState", "field": "phone" } }
}
```
The OTP code itself comes from the form's `otpInput` (field `otpCode`) automatically. `makeOrder` → `checkout.placeOrder` is correct ✅ — note it also accepts an optional `guestEmail` param (see Part 3.4).

---

### 🟡 E5 — `ContentHtml` contradiction inside the doc

§3 aliases `ContentHtml → Html (→ richtext)` and §6.3 converts it to `richtext` — but §10 lists `ContentHtml` as "Stripped to plain `text` or omitted with warning". The engine has a working `richtext` renderer; §6.3 is correct. Remove the §10 row (or reword it to "→ `richtext`, see §6.3").

### 🟡 E6 — `SideDrawer` contradiction between §10 and §13

§10: "`SideDrawer` — handled as `SiteDrawerShell` (generates `appDrawer`)". §13: "`SideDrawer` — `unsupported` (use `ZoneDrawer` → appDrawer)". Pick one — §10's behavior is the useful one.

---

## Part 3 — NEW engine features (added 2026-07-04) missing from the spec

Four additions shipped for the checkout address flow. All verified in source and live in `mobile_production_v2`.

---

### 3.1 — `switchField` component (spec: `34-switch-field.md`)

New registered type (renderer + registry + schema verified). Labeled on/off toggle bound to `FormStateStore` — stores `"true"`/`"false"` strings under `props.id`. **Web toggle/checkbox-style single-boolean inputs map here.**

Add to §2 Input/forms: `switchField`.

```json
{
  "id": "address-details-default-toggle",
  "type": "switchField",
  "props": {
    "id": "isDefault",
    "label": "تعيين كعنوان افتراضي",
    "activeColor": "#1D4ED8"
  }
}
```

| Prop | Notes |
|------|-------|
| `id` / `controllerId` | FormStateStore key; value `"true"`/`"false"` |
| `label` | Inline-start text (RTL-aware) |
| `value` / `valuePath` | Initial state (form store wins) |
| `activeColor`, `labelColor`, `fontSize`, `margin` | Styling |
| `enabled` | Default `true` |
| `onChanged` | Action dispatched with the new value |

A `source: "form"` cubitCall param then reads the `"true"`/`"false"` string (e.g. `isDefault` on `checkout.saveAddress`).

---

### 3.2 — `appBar` gradient background (spec: `30-appbar-gradient-background.md`)

Two modes, verified in `app_bar_renderer.dart`:

| Prop | Behavior |
|------|----------|
| `backgroundGradient: true` | Theme-bound top→bottom gradient: top = `theme.colors.primary`, bottom = `theme.colors.background`. Preferred — tracks merchant rebrands automatically |
| `backgroundGradientTop` + `backgroundGradientBottom` (hex pair) | Explicit override; wins over theme-bound |

Rules for the converter: the explicit pair is all-or-nothing (one alone falls back to solid `backgroundColor`); when a gradient is active, `backgroundColor` has no visual effect; direction is fixed top→bottom. Map web header gradients to the explicit pair; map "use brand gradient" to `backgroundGradient: true`.

---

### 3.3 — `radioGroup` removable items (`badge`, `removable`, `onItemRemove`)

Verified in `radio_group_renderer.dart`. Items (static or dynamic) now support:

| Item field | Notes |
|-----------|-------|
| `badge` | Small tag rendered on the row (e.g. "المنزل" / "العمل") |
| `removable: true` | Shows a ✕ on the row |

New group-level action prop:

| Prop | Notes |
|------|-------|
| `onItemRemove` | Action dispatched when a row's ✕ is tapped, with `{ value, index, label }` in `dataContext.tap` — e.g. `cubitCall checkout.deleteAddress { addressId: { source: "tap", field: "value" } }` |

Add to §6.30's prop table. Web "selectable list with delete" patterns map here.

---

### 3.4 — Checkout address flow (spec: `35-checkout-address-flow.md`)

New checkout cubitCall methods the converter may target (all verified):

| `method` | Purpose | Key params |
|----------|---------|-----------|
| `pickAddressLocation` | Closes any sheet, pushes the **native map picker**; `onSuccess` fires only on confirmed location | — |
| `saveAddress` | Save address (customer address book when logged-in, inline draft for guests) + recalc shipping | `label` (HOME/WORK/OTHER), `recipientName`, `recipientPhone`, `streetAddress`, `notes`, `isDefault` |
| `selectSavedAddress` | Set delivery address + recalc | `addressId` (or radio `tap.value`) |
| `deleteAddress` | Remove saved address | `addressId` |
| `setDefaultAddress` | Server-side default flag | `addressId` |
| `placeOrder` (extended) | Now accepts optional `guestEmail` | `guestEmail` from the guest contact form |

New dataContext keys available for bindings: `checkout.addressOptions` (radioGroup-ready items with badge/removable), `checkout.selectedAddressId`, `checkout.hasPendingLocation`, `checkout.pendingLocation.areaLine` / `.streetLine`, and **`session.isLoggedIn`** (for `visibleWhen`, e.g. guest-only cards use `when: "equals", value: "false"`).

**Locked contract for the converter:** guest email is a **checkout-payload field, not an address field** — never emit email inputs inside address forms; it lives in a guest-only contact card on `/checkout` whose value feeds `placeOrder.params.guestEmail`.

**There is no map component type** — the map screen is native; JSON reaches it only via `cubitCall checkout.pickAddressLocation`. Web map/location blocks with no such trigger → `unsupported` + warning.

---

## Checklist additions (append to §11)

- [ ] Cart quantity buttons → `cubitCall cart.updateQuantity` with `variantId` (`source: "item"`) + `delta` (`source: "value"`) — never `increaseQuantity`/`decreaseQuantity`, never `lineId`
- [ ] cubitCall param `source` ∈ { `form`, `tap`, `item`, `dataContext`/`context`, `pageState`, `routeParams`, `authState`, `app`, `value` } — **`data` is only valid in `visibleWhen`**
- [ ] No `labelPath` on `button`, no `semanticsLabelPath` on `image` (not engine props — use static labels or a `text` + `valuePath` node)
- [ ] `verifyOtp` includes `formId` + `params.phone` (`source: "authState"`)
- [ ] Web boolean toggles → `switchField` (value stored as `"true"`/`"false"` strings)
- [ ] AppBar gradient: `backgroundGradient: true` or the full explicit hex **pair** — never a single hex gradient prop
- [ ] Every generated non-tab route appears in **both** `pages[]` and `navigation.shellExcludeRoutes`
- [ ] No email fields in address forms — guest email goes to the `/checkout` contact card → `placeOrder.params.guestEmail`

---

*Follows `CONVERTER-SPEC-REVIEW-2026-07-03.md` (all its points confirmed applied). Engine references: `docs/engine/builder-specs/34-switch-field.md`, `30-appbar-gradient-background.md`, `35-checkout-address-flow.md`, `31-bottom-sheet-actions.md` (replaceCurrent), `32-page-footer-slot.md` (overlay).*
