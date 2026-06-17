# Builder specs — JSON gaps for the website builder

When implementing [renderer audit phases](../RENDERER_AUDIT_IMPLEMENTATION_PLAN.md), the mobile engine may support **props, page fields, or `theme` keys** that are **not yet present** in the active production config:

[`assets/config/mobile_production_v2.json`](../../../assets/config/mobile_production_v2.json)

Those gaps must **not** be left implicit. Document them here so the **website builder** (config authoring tool / team) can implement the same shape on their side and publish updated JSON.

---

## When to create a builder spec

Create or update a file in this folder if **any** of the following is true during a phase:

| Situation | Example |
|-----------|---------|
| New optional/required **component `props`** supported in Dart but **0 usages** in `mobile_production_v2.json` | `emptyMessage` on `gridView` |
| New **page-level** field parsed in app but missing from all `pages[]` entries | `scroll: "none"` |
| New **`theme`** subsection consumed by `ThemeData` but absent or incomplete in JSON | `theme.buttons.lg` used as default |
| **Renamed or corrected** JSON key (builder must migrate) | `color` vs `foregroundColor` on `appBar` |
| **`data` / `tap` / `itemBuilder`** shape extension | `requestKey` + loading flags documented for lists |

**Do not** create a spec when the prop **already exists** in production JSON (verify with search).

**Do not** use specs for Dart-only internals (`dataContext`, cubits, `FormStateStore`) unless the builder must emit a related JSON field.

---

## When to edit production JSON instead

| Phase type | Who updates `mobile_production_v2.json` |
|------------|----------------------------------------|
| Phase **3**, **7**, or explicit “JSON-only” tasks | **This repo** — apply tokens and wire new props on real pages |
| Engine-only phases (1, 2, 4, 5, …) | **Builder team** via spec — unless the phase checklist says to patch JSON |

If the phase **allows** JSON edits, you may **both** update `mobile_production_v2.json **and** add a short spec noting “now implemented in repo as reference”.

---

## File naming

```
docs/engine/builder-specs/<phase>-<short-slug>.md
```

Examples:

- `02-list-grid-request-ui.md` — `emptyMessage`, `requestKey`, loading props
- `04-theme-tokens.md` — theme keys the app reads vs what JSON currently defines
- `08-page-scroll.md` — page `scroll` field behavior

Copy structure from [`_TEMPLATE.md`](_TEMPLATE.md).

---

## Index

| Spec | Phase | Status | Summary |
|------|-------|--------|---------|
| [02-list-grid-request-ui.md](02-list-grid-request-ui.md) | 2, 7 | implemented-in-json | `emptyMessage`, `errorMessage`, `requestKey` loading/empty/error on list/grid |
| [05-high-traffic-renderers.md](05-high-traffic-renderers.md) | 5 | ready-for-builder | `button.enabled`, `appBar.foregroundColor` / `titleColor`, optional text truncation props |
| [06-form-autovalidate.md](06-form-autovalidate.md) | 6 | ready-for-builder | `form.props.autovalidateMode` (`onUserInteraction` \| `disabled`) |
| [08-page-scroll.md](08-page-scroll.md) | 8 | ready-for-builder | `pages[].scroll: "none"` — outer scaffold scroll off |
| [10-accessibility-props.md](10-accessibility-props.md) | 10 | ready-for-builder | `image` `semanticsLabel`/`alt`; `card` `accessibilityLabel`; `tap.semanticLabel` |
| [12-splash-screen-primitives.md](12-splash-screen-primitives.md) | 12 | implemented-in-json | Two-page flow `/splash` → `/splash-carousel` → auth; `progressIndicator`, pill indicators, button typography |
| [13-navigation-type.md](13-navigation-type.md) | Nav 2–7 | implemented-in-json | `navigation_type` push on detail taps; `clear_stack` on splash/auth/checkout; logout `onSuccess` |
| [14-textformfield-textdirection.md](14-textformfield-textdirection.md) | UI fixes | implemented-in-json | `textFormField.textDirection` ltr/rtl; phone fields default LTR |
| [15-page-layout-preset.md](15-page-layout-preset.md) | Layout Phase 3 | implemented-in-json | `pages[].layout: "centered"` — splash viewport preset |
| [16-app-drawer-tabs-otp.md](16-app-drawer-tabs-otp.md) | Engine primitives | mixed | `appDrawer`, in-page `tabs`, `otpInput` (+ `openDrawer`/`closeDrawer` actions); OTP on `/auth/otp-reset` |
| [17-appbar-layout-ui.md](17-appbar-layout-ui.md) | AppBar layout/UI | implemented-in-json | `appBar.elevation`, alpha/`transparent` `backgroundColor`; body-only SafeArea (engine default) |
| [18-contact-button-open-contact.md](18-contact-button-open-contact.md) | Contact CTAs | implemented-in-json | `contactButton`, `button.icon`, `openUrl`/`openContact`, `app.supportWhatsApp`/`supportPhone` |
| [19-sized-box-spacing.md](19-sized-box-spacing.md) | Layout spacing | ready-for-builder | `sizedBox` fixed width/height spacing (replaces empty `container` / removed `spacer`) |
| [20-commerce-cart-cubit-call.md](20-commerce-cart-cubit-call.md) | Commerce Phase 1 | implemented-in-json | `cubitCall` `cubit: cart`; `cart.items` repeat binding; variant picker gate |
| [21-commerce-checkout-cubit-call.md](21-commerce-checkout-cubit-call.md) | Commerce Phase 3 | implemented-in-json | `cubitCall` `cubit: checkout`; wizard routes; payment methods `requestUrl`; order success bindings |
| [22-commerce-order-cubit-call.md](22-commerce-order-cubit-call.md) | Commerce Phase 4 | implemented-in-json | `cubitCall` `cubit: order`; my-orders list; order detail + shipment; guest track |
| [../web-to-mobile-converter/README.md](../web-to-mobile-converter/README.md) | Web → Mobile | reference | Full Erteqa web block → mobile SDUI conversion rules; complements builder-specs for cross-platform JSON |

Update this table when adding a spec.

---

## Verification command

Before marking a phase done, confirm prod JSON coverage:

```powershell
# Example: check if emptyMessage exists in production config
Select-String -Path assets\config\mobile_production_v2.json -Pattern "emptyMessage"
```

If engine code references a prop and search returns **no matches**, a builder spec is **required** (unless this phase added it to JSON).

---

## Related

- Config schema: [`docs/ai/02-config-and-json.md`](../../ai/02-config-and-json.md)
- Audit: [`RENDERER_PRODUCTION_AUDIT.md`](../RENDERER_PRODUCTION_AUDIT.md)
- Phase plan: [`RENDERER_AUDIT_IMPLEMENTATION_PLAN.md`](../RENDERER_AUDIT_IMPLEMENTATION_PLAN.md)
