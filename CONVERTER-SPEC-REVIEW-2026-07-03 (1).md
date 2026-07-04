# Converter Output Spec — Verification & Delta Review
**Date:** 2026-07-03  
**Reviewing:** `CONVERTER-OUTPUT-SPEC.md` version **2026-07-02** (the revision made after `CONVERTER-SPEC-REVIEW-2026-07-01.md`)  
**Verified against:** current engine source — renderers, `component_schemas.dart`, `action_dispatcher.dart`, `variant_config_parser.dart`, `visible_when.dart`, and `assets/config/mobile_production_v2.json`.

> Addressed to the **web developer**. Part 1 confirms your fixes. Part 2 lists issues found in the revised spec (one breaks the example output). Part 3 covers **engine features added 2026-07-03** that the converter/spec doesn't know about yet.

---

## Part 1 — Confirmed fixed ✅

All 16 points from the previous review are correctly applied in v2026-07-02:

| # | Point | Where fixed | Verified |
|---|-------|-------------|----------|
| C1 | `textFormField` uses `props.id`, never `name` | §6.23 + note + checklist | ✅ matches renderer + prod config |
| C2 | `scaffold` removed from valid types | §2 + callout + checklist | ✅ |
| I1 | Shadow token map (sm/md/lg/xl/none) + CSS mapping | §5 "Shadow token map" | ✅ scoped correctly to container/button/textFormField |
| I2 | G4/G5 reframed as converter preference | §4 G4, G5 | ✅ style-key list matches parser exactly |
| I3 | `showBackButton` removed; automatic-back note added | §7 appBar | ✅ |
| I4 | `openContact` / `formAdjust` in action reference table | §4 G2 table | ✅ |
| I5 | Stack child positioning props documented | §6.12 + `stackLayer: "fill"` on bg images | ✅ |
| I6 | appBar wishlist toggle + RTL note | §7 | ✅ |
| M1 | contactButton as optional §6.5b | §6.5b | ⚠️ example has a bug — see N1 below |
| M2 | `semibold → "semibold"/"w600"`, accepted-values note | §5 font weight map | ✅ h3/h4 `w600` correctly kept |
| M3 | `alt` accepted alongside `semanticsLabel` | §6.8 + checklist | ✅ |
| M4 | `loop`/`muted` dropped from videoPlayer | §6.10 + note | ✅ |
| M5 | Timer rule with no invented targets | §6.29 | ✅ |
| M6 | imageSlider advanced props | §6.16 | ✅ |
| M7 | `enabledPath`/`enabledWhen` | §6.5 | ✅ |
| M8 | textFormField full prop table | §6.23 | ✅ |
| — | CategoryListMenu/ProductSearchMenu stay `unsupported` with actionable warnings | §10, §12 | ✅ correct approach |

---

## Part 2 — Issues in the revised spec

---

### 🔴 N1 — §6.5b `contactButton` example renders a DISABLED button

**Your example:**
```json
{
  "type": "contactButton",
  "props": { "channel": "whatsapp", "label": "تواصل عبر واتساب", "fullWidth": true },
  "tap": { "type": "openContact", "channel": "whatsapp", "target": "+966501234567" }
}
```

**Verified engine behavior** (`contact_button_renderer.dart:48-61`): the renderer requires `props.target` **or** `props.targetPath` to resolve non-empty — otherwise `enabled = false` and the button is greyed out and untappable. The `tap` alone is not enough: `tap` provides the press handler, `props.target` provides the enabled state.

(Also correcting my own earlier review: I wrote that contactButton "handles the URI internally, no tap needed" — that was wrong too. The tap **is** required; the renderer takes `onTap` injected from node-level `tap`.)

**Correct shape — this is the exact pattern from the live production config** (`mobile_production_v2.json:6203`):
```json
{
  "id": "contact-btn-1",
  "type": "contactButton",
  "props": {
    "channel": "whatsapp",
    "label": "واتساب",
    "target": "+966501234567",
    "fullWidth": true,
    "borderRadius": 10
  },
  "tap": { "type": "openContact", "channel": "whatsapp", "target": "+966501234567" }
}
```

**Rule:** `channel` + `label` + (`target` or `targetPath`) in `props`, **plus** the node-level `tap: { type: "openContact", channel, target }`. Same target value in both places.

---

### 🔴 N2 — §6.6 `Link` emits literal `variant: "ghost"` → renders as a SOLID filled button

**Your §6.6 example:**
```json
{ "type": "button", "props": { "label": "تفاصيل", "variant": "ghost", "height": 36 } }
```

**Verified** (`button_renderer.dart:113-143`): the variant switch handles `text`, `outlined`/`secondary`, `filled`/`elevated`; **everything else falls to the default case → `FilledButton`** (solid primary background). So `"ghost"` produces the visual opposite of a ghost link.

Your own variant map in §5 is correct (`ghost → text`) — §6.6 just doesn't apply it.

**Fix §6.6:**
```json
{ "type": "button", "props": { "label": "تفاصيل", "variant": "text" } }
```

---

### ✅ N3 — `button.height` — RESOLVED: engine support added 2026-07-03

**Was:** `ButtonRenderer` ignored `height`; the §5 size map and every `"height": 48` in button examples had no effect.

**Now:** the engine supports `button.height` (spec: `docs/engine/builder-specs/33-button-height.md`, tested for all variants). Your §5 size map and existing examples work as-is — **no converter change needed**. Behavior contract:

| Rule | Behavior |
|------|----------|
| `height > 0` | Authoritative: exact visual AND layout height for all variants (`elevated`/`filled`/`outlined`/`text`) |
| `height` omitted / `<= 0` | Theme-driven as before (`theme.buttons.md.height`) |
| Vertical padding | Dropped when height is explicit — the label auto-centers; explicit `props.padding` still wins |
| Tap target | Shrink-wrapped to the visual height — avoid values below ~32 for touch usability |
| `fullWidth` / `maxWidth` | Unaffected — width logic is independent |

**Two refinements for the spec:**
1. For web `size: "md"` prefer **omitting** `height` (theme default keeps merchant-wide consistency) rather than emitting `48`.
2. `contactButton` still ignores `height` (stays theme-height) — don't emit it there.

---

### 🟢 N4 — §6.21 "Stats" heading missing

The `### 6.21 Stats` heading was lost in the revision — §6.20 flows straight into the Stats web-input block. Restore the heading (breaks anchors/TOC otherwise).

### 🟢 N5 — §12 duplicate rows

`CategoryListMenu` and `ProductSearchMenu` each appear twice in Known Limitations (their own rows + the combined "auto-navigate Retracted" row). Keep one row each. Also the "Heading `w600`" row is a note, not a limitation — consider moving it to §6.2.

---

## Part 3 — NEW engine features (added 2026-07-03) missing from the spec

Three features shipped for the checkout redesign. All are live in `mobile_production_v2` and have builder specs under `docs/engine/builder-specs/`. The converter spec should add them.

---

### 3.1 — `radioGroup` component (spec: `30-radio-group.md`)

New registered type (schema + renderer + registry, verified). Single-choice vertical radio list — used for payment-method selection. **Web blocks with radio semantics (payment options, shipping options, single-choice option lists) should map to this instead of a decomposed column of buttons.**

Add to §2 under "Input / forms": `radioGroup`.

**Shape (from production `/checkout`):**
```json
{
  "id": "checkout-payment-methods",
  "type": "radioGroup",
  "props": {
    "id": "paymentMethod",
    "itemsPath": "requests.payment-methods.data",
    "itemLabelPath": "displayName",
    "itemValuePath": "providerCode",
    "itemEnabledPath": "selectable",
    "selectedValuePath": "checkout.selectedPaymentMethod",
    "showItemAvatar": true,
    "activeColor": "#1D4ED8",
    "gap": 10,
    "emptyHint": "لا توجد وسائل دفع"
  },
  "data": { "requestKey": "payment-methods", "requestUrl": "/api/v1/public/payments/methods" },
  "tap": {
    "type": "cubitCall", "cubit": "checkout", "method": "selectPaymentMethod",
    "params": { "providerCode": { "source": "tap", "field": "value" } }
  }
}
```

**Key props** (full table in `30-radio-group.md`):

| Prop | Notes |
|------|-------|
| `id` | FormStateStore key; label auto-mirrored to `{id}_label` |
| `data.items` | Static items `{ label, value, subtitle?, imageUrl?, disabled? }` |
| `itemsPath` + `itemLabelPath`/`itemValuePath`/`itemSubtitlePath`/`itemImagePath`/`itemEnabledPath` | Dynamic items |
| `value` / `selectedValuePath` | Initial selection (form store wins) |
| `showItemAvatar` / `avatarColor` | Item image or letter avatar at inline-end |
| `activeColor`, `gap`, `itemPadding`, `color`, `borderRadius`, `border` | Styling |
| `validateRequired` / `requiredMessage` | Validation inside a `form` |
| `tap` / `onChanged` | Receive `{ value, index, label }` in `dataContext.tap` |

---

### 3.2 — `openBottomSheet` / `closeBottomSheet` actions (spec: `31-bottom-sheet-actions.md`)

Two new `tap.type` values (verified in `action_dispatcher.dart`). They are **actions**, not component types. There is no `type: "bottomSheet"` node; the sheet is opened by a trigger node's `tap`, and the sheet content lives under `tap.child` as a normal mobile component tree.

Add rows to the §4 G2 action table:

| `tap.type` | Shape | Use |
|------------|-------|-----|
| `openBottomSheet` | `{ "type": "openBottomSheet", "child": { <component tree> }, "showDragHandle": true, "isScrollControlled": true, "isDismissible": true, "heightFactor": 0.6, "backgroundColor": "#FFFFFF", "borderRadius": 20, "padding": 16, "onClose": { <action> }, "replaceCurrent": false }` | Modal sheet with an inline JSON component tree (e.g. address edit, option picker) |
| `closeBottomSheet` | `{ "type": "closeBottomSheet" }` | Close the top engine-opened sheet (typical in a `cubitCall.onSuccess`) |

**Action field contract:**

| Field | Converter rule |
|-------|----------------|
| `child` | Required. Must be a full mobile component node with `id`, `type`, and `props` (usually `column`). Do not put a page object, `body[]`, or `scaffold` here. |
| `showDragHandle` | Optional; defaults to `true`. Omit unless the web design explicitly hides the handle. |
| `isScrollControlled` | Optional; defaults to `true`. Keep true for forms and option lists. |
| `isDismissible` | Optional; defaults to `true`. Set `false` only for blocking flows that also provide an explicit close/submit path. |
| `heightFactor` | Optional number; engine clamps to `0.2..1.0`. Use for known fixed-height pickers (`0.45`-`0.75`). Omit for content-height forms. |
| `backgroundColor` | Optional sheet surface color; emit only when design differs from theme sheet surface. |
| `borderRadius` | Optional top corner radius; default `20`. |
| `padding` | Optional number or edge-insets object. Default is horizontal/bottom padding with no extra top padding because the drag handle occupies top space. Keyboard inset is added automatically. |
| `onClose` | Optional action fired after the sheet closes by any path (button, drag, backdrop, programmatic close). Use for refresh/reload side effects, not for validation. |
| `replaceCurrent` | Optional bool; default `false`. Required when a trigger inside a sheet opens another sheet. |

**When to emit `openBottomSheet`:**

| Web pattern | Mobile output |
|-------------|---------------|
| Dialog/modal with a bounded form | Trigger node `tap.openBottomSheet`; form is `tap.child`; submit button uses `cubitCall`/`apiCall` with `onSuccess: closeBottomSheet`. |
| Popover/dropdown/select that chooses one item from known options | Trigger row/card `tap.openBottomSheet`; sheet contains a `radioGroup`; selection action closes the sheet on success. |
| "Edit" affordance for an address, profile field, shipping option, payment method | Same sheet pattern; prefill fields from current data snapshot or form defaults. |
| Sheet that opens a second sheet | Inner trigger uses `openBottomSheet` with `"replaceCurrent": true`. |

**When NOT to emit it:**

| Web pattern | Use instead |
|-------------|-------------|
| Page-level sticky CTA / checkout dock | `pages[].footer` (see §3.3), not a bottom sheet. |
| Full search experience or category browsing surface | Dedicated `/search` or `/categories` route unless the web input contains a deliberately small picker sheet contract. Do not infer a search/category sheet just because `openBottomSheet` exists. |
| Content that must live-update while open from `checkout.*`, `cart.*`, or `requests.*` changes | Use a page or close/reopen after mutation. Sheet dataContext is a snapshot. |
| Unknown web modal content that cannot be converted into mobile primitives | Emit `unsupported` with an actionable warning instead of inventing a partial sheet. |

**⚠️ Constraint to document:** sheet content renders from a **snapshot** of dataContext taken at open time — cubit-driven values (`checkout.*`, `cart.*`, `requests.*`) do NOT live-update inside an open sheet; form fields stay live (controller-backed). Supported pattern: form inputs → `cubitCall` → `onSuccess: closeBottomSheet`. The page **behind** the sheet rebuilds normally once it closes, so any state the sheet mutated is fresh again after close.

#### `replaceCurrent` — sheet-opens-a-sheet

`{ "type": "openBottomSheet", "replaceCurrent": true, "child": { ... } }` closes the currently-open engine sheet **before** opening the new one, instead of stacking a second sheet on top. Required whenever a button *inside* an open sheet opens another sheet (e.g. "+ إضافة عنوان جديد" inside an address picker opening the address-entry form) — stacking would leave the new sheet showing a stale snapshot taken before the first sheet's own dataContext changes. **Rule: any `openBottomSheet` whose trigger lives inside another sheet's `child` tree must set `"replaceCurrent": true`.**

#### Picker-sheet pattern (production reference: `/checkout` payment + address)

This is the canonical shape for "tap a summary row → pick one of several options in a sheet → row updates". Convert a web select/dropdown/radio-picker-in-a-modal block to this exact structure:

1. **Trigger row** (in the page body): a `row` (or any tappable node) whose `tap` is `openBottomSheet`. The row displays the *current* selection (or a placeholder) plus a trailing chevron (`chevron_left`, since RTL "forward" points left) — it does **not** contain the picker UI itself.
2. **Sheet header** (first child of the sheet's `column`): `row` with `mainAxis: "spaceBetween"` containing:
   - Title `text` (bold, ~17px) on the right.
   - A circular close button on the left: `container` with `color` (light grey, e.g. `#F1F5F9`) + `borderRadius: 16` + small padding (e.g. `6`), `tap: { "type": "closeBottomSheet" }`, wrapping a `close` icon (size ~16, muted color).
3. **Options list**: a `radioGroup` (see §3.1, now extended below) bound to the same collection the trigger row reads from, with `selectedValuePath` pointing at the currently-selected value so the sheet opens pre-selected.
4. **Selecting an option** dispatches the domain `cubitCall` (or `setPageState`) directly from the `radioGroup`'s `tap`, with `"onSuccess": { "type": "closeBottomSheet" }` — the sheet closes itself on a successful selection; no separate "confirm" button needed for a single-choice picker.
5. If the sheet also offers a "create new" action (e.g. add a new address), its button uses `openBottomSheet` with `"replaceCurrent": true` per the rule above, and the replacement sheet repeats the same header pattern (title + circular close).

**Do not** reintroduce a decomposed inline list of buttons/cards for this pattern once a picker sheet exists — the trigger row + sheet pair *replaces* an inline list, it does not sit alongside one. (Exception: if the design explicitly shows the first N options inline with a "see more" link — see §3.1a below — the inline list and the sheet coexist by design.)

**Minimal picker example (converter output shape):**

```json
{
  "id": "checkout-payment-more",
  "type": "text",
  "props": { "value": "المزيد", "fontSize": 13, "fontWeight": "semibold", "color": "#1D4ED8" },
  "tap": {
    "type": "openBottomSheet",
    "semanticLabel": "اختر طريقة الدفع",
    "child": {
      "id": "checkout-payment-sheet",
      "type": "column",
      "props": { "gap": 14, "crossAxis": "stretch" },
      "children": [
        {
          "id": "checkout-payment-sheet-header",
          "type": "row",
          "props": { "mainAxis": "spaceBetween", "crossAxis": "center" },
          "children": [
            { "id": "checkout-payment-sheet-title", "type": "text", "props": { "value": "اختر طريقة الدفع", "fontSize": 17, "fontWeight": "bold", "textAlign": "right" } },
            {
              "id": "checkout-payment-sheet-close",
              "type": "container",
              "props": { "color": "#F1F5F9", "borderRadius": 16 },
              "style": { "padding": 6 },
              "tap": { "type": "closeBottomSheet", "semanticLabel": "إغلاق" },
              "child": { "id": "checkout-payment-sheet-close-icon", "type": "icon", "props": { "name": "close", "size": 16, "color": "#475569" } }
            }
          ]
        },
        {
          "id": "checkout-payment-sheet-options",
          "type": "radioGroup",
          "props": {
            "id": "paymentMethod",
            "itemsPath": "requests.payment-methods.data",
            "itemLabelPath": "displayName",
            "itemValuePath": "providerCode",
            "itemSubtitlePath": "subtitle",
            "itemEnabledPath": "selectable",
            "selectedValuePath": "checkout.selectedPaymentMethod",
            "showItemAvatar": true,
            "itemPadding": 12,
            "color": "#FFFFFF",
            "borderRadius": 12,
            "border": { "width": 1, "color": "#E2E8F0" },
            "selectedBorderColor": "#1D4ED8",
            "activeColor": "#1D4ED8",
            "gap": 10,
            "emptyHint": "لا توجد وسائل دفع"
          },
          "tap": {
            "type": "cubitCall",
            "cubit": "checkout",
            "method": "selectPaymentMethod",
            "params": { "providerCode": { "source": "tap", "field": "value" } },
            "onSuccess": { "type": "closeBottomSheet" }
          }
        }
      ]
    }
  }
}
```

**Minimal form-sheet example:**

```json
{
  "id": "checkout-address-edit",
  "type": "row",
  "props": { "gap": 4, "crossAxis": "center" },
  "tap": {
    "type": "openBottomSheet",
    "semanticLabel": "تعديل العنوان",
    "child": {
      "id": "checkout-address-form-sheet",
      "type": "column",
      "props": { "gap": 12, "crossAxis": "stretch" },
      "children": [
        { "id": "checkout-address-form-title", "type": "text", "props": { "value": "عنوان التوصيل", "fontSize": 17, "fontWeight": "bold", "textAlign": "right" } },
        {
          "id": "checkout-address-sheet-form",
          "type": "form",
          "props": { "formId": "checkout-address-form" },
          "child": {
            "id": "checkout-address-sheet-col",
            "type": "column",
            "props": { "gap": 12, "crossAxis": "stretch" },
            "children": [
              { "id": "checkout-sheet-field-name", "type": "textFormField", "props": { "id": "fullName", "label": "الاسم الكامل", "textAlign": "right", "validateRequired": true } },
              { "id": "checkout-sheet-field-phone", "type": "textFormField", "props": { "id": "phone", "label": "رقم الجوال", "keyboardType": "phone", "textDirection": "ltr", "textAlign": "left", "validateRequired": true } },
              {
                "id": "checkout-sheet-save",
                "type": "button",
                "props": { "label": "حفظ العنوان", "variant": "filled", "fullWidth": true },
                "tap": {
                  "type": "cubitCall",
                  "cubit": "checkout",
                  "method": "saveAddress",
                  "requireValidForm": true,
                  "formId": "checkout-address-form",
                  "params": {
                    "recipientName": { "source": "form", "field": "fullName" },
                    "phone": { "source": "form", "field": "phone" }
                  },
                  "onSuccess": { "type": "closeBottomSheet" }
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

### 3.3 — Page-level `footer` slot + button trailing text + dashed divider (spec: `32-page-footer-slot.md`)

**`pages[].footer`** — a page-level key (sibling of `appBar`/`body`, verified in `variant_config_parser.dart:134-210`): one component node pinned below the scrollable body. It owns the bottom safe-area; footer chrome (background/shadow/padding) must be authored explicitly, usually a `container`.

**`footer.overlay: true`** *(added 2026-07-04)* — optional key on the footer node itself (sibling of `type`; the parser strips it before component parsing). Default (`false`): the footer reserves layout space and the body ends above it. With `overlay: true` the footer **floats over** the body — content scrolls behind it (used for the rounded-corners-over-content look). In overlay mode the converter must also emit a `sizedBox` spacer at the end of the body's scroll column so the last content clears the bar (production `/product/details` uses `height: 116`).

**Converter relevance:** a sticky/pinned web CTA bar (e.g. checkout "place order", product add-to-cart) maps to `footer`, **not** to the end of `body[]`. Add `footer` to the §7 page envelope.

**🔴 Hard rule — one mechanism only:** `pages[].footer` is the **only** valid converter output for a page-level pinned bottom bar. Do **not** synthesize one from `stack` + `stackLayer: "positioned"` / `stackInsetBottom: 0` — that pattern is deprecated for footers (production `/product/details` was migrated off it on 2026-07-04 and now uses `footer` + `overlay: true`). `stackLayer` positioning remains valid only for overlays *within* a component (badge on an image, text over a banner). This keeps exactly one builder concept ("sticky footer section" on a page) and one conversion rule — no heuristics, and the tenant never chooses between two mechanisms.

**Live production reference** (`/product/details/:productId`, node `product-detail-footer`):

```json
"footer": {
  "overlay": true,
  "id": "product-detail-footer",
  "type": "container",
  "style": {
    "background": "#FFFFFF",
    "borderRadius": { "topLeft": 24, "topRight": 24, "bottomLeft": 0, "bottomRight": 0 },
    "padding": { "left": 16, "right": 16, "top": 16, "bottom": 12 },
    "shadow": "lg"
  },
  "child": { "...": "add-to-cart row" }
}
```

Note the footer renders outside the body's `form`/request subtrees, but form state and `requests.{key}` results are page-scoped in the engine — `source: "form"` params, `visibleWhen: { "source": "form" }`, and `valuePath`/`enabledPath` bindings inside the footer all resolve normally.

```json
{
  "route": "/checkout",
  "appBar": { },
  "footer": {
    "id": "checkout-footer",
    "type": "container",
    "props": { "color": "#FFFFFF", "shadow": "md", "padding": { "top": 12, "bottom": 12, "left": 16, "right": 16 } },
    "child": {
      "id": "checkout-place-order",
      "type": "button",
      "props": { "label": "تأكيد الطلب", "variant": "filled", "fullWidth": true, "trailingTextPath": "checkout.payableTotalFormatted" }
    }
  },
  "body": [ ]
}
```

**`button.trailingText` / `trailingTextPath`** (verified in `button_renderer.dart:98-106,195-201`): secondary text at the button's inline-end (e.g. a price total). `trailingTextPath` wins when it resolves. Add to §6.5 supported props.

**`divider.variant: "dashed"`** (verified in `divider_renderer.dart:22-25`): dashed line using existing `thickness`/`color`/`height`. Add to §6.9. Web dashed/dotted border-style dividers should now emit this instead of a solid divider.

---

### 3.4 — `visibleWhen` (existing feature, still absent from the spec — now extended)

Any node can carry `props.visibleWhen`; the wrap is applied generically by the ScreenRenderer (not just container/column). Just extended (verified in `visible_when.dart`) with an `equals` mode and a `data` source:

```json
{
  "type": "container",
  "props": {
    "visibleWhen": { "source": "data", "field": "checkout.selectedPaymentMethod", "when": "equals", "value": "cod" }
  }
}
```

| Field | Values |
|-------|--------|
| `source` | `form` (default) \| `pageState` \| `data`/`dataContext` |
| `field` | form field id / pageState key / dataContext path |
| `when` | `nonEmpty` (default) \| `isEmpty` \| `equals` |
| `value` | Comparison value for `equals` |

**Converter relevance:** web conditional-visibility rules (e.g. "show when field X is filled/equals Y") can now be emitted instead of being dropped.

---

## Checklist additions (append to §11)

- [ ] `contactButton` has `props.target` or `props.targetPath` **and** a node-level `tap: openContact` (same target)
- [ ] `button.height` only when non-default (`sm`→36, `lg`→56); omit for `md` (theme default); never on `contactButton`
- [ ] No literal `"ghost"`/`"primary"`/etc. in output — §5 variant map applied (`ghost` → `text`)
- [ ] Pinned/sticky CTA bars → page-level `footer`, never end of `body[]` and never a `stack` overlay (`stackLayer: "positioned"` is for intra-component overlays only)
- [ ] `footer.overlay: true` only when the design floats the bar over content; then also emit an end-of-body `sizedBox` spacer that clears the bar
- [ ] Radio-style single-choice blocks → `radioGroup` (not a column of buttons)
- [ ] `openBottomSheet.child` is a full component node (root has `id`, `type`, `props`)

---

*Supersedes `CONVERTER-SPEC-REVIEW-2026-07-01.md` (all its points are now applied). Engine references: `docs/engine/builder-specs/30-radio-group.md`, `31-bottom-sheet-actions.md`, `32-page-footer-slot.md`.*
