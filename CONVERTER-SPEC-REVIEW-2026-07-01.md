# Converter Output Spec — Gap & Fix Review (verified)
**Date:** 2026-07-01 (revised after full source verification)  
**Reviewing:** `CONVERTER-OUTPUT-SPEC.md` (version 2026-07-01)  
**Verified against:** every renderer in `lib/engine/tree/renderers/`, `lib/engine/validation/component_schemas.dart`, `lib/engine/tree/parsers/property_parsers.dart`, `lib/features/variantscreen/data/repos/variant_config_parser.dart`, `lib/engine/actions/action_dispatcher.dart`, and the live `assets/config/mobile_production_v2.json`.

> **Every claim in this document was checked against the Dart source or the production config.** Where a rule depends on merchant-specific data (routes, screens), it is flagged — the converter must NOT hard-code assumptions about what pages exist.

---

## Quick Status

| Severity | Count | Meaning |
|----------|-------|---------|
| 🔴 Critical | 2 | Produces output the engine silently ignores or mis-renders |
| 🟡 Important | 6 | Missing features / dead props / misleading rules |
| 🟢 Minor | 8 | Incomplete coverage, polish |

**Removed from the previous draft** (were wrong): the CategoryListMenu/ProductSearchMenu "emit a navigate button" rule, and the "`w600` is invalid" claim. Both were based on assumptions that the source contradicts — see the [Retracted](#retracted-from-earlier-review) section.

---

## 🔴 Critical

---

### C1 — `textFormField` field key must be `id`, not `name`

**Location:** Section 6.23 (ContactForm)

**Current output:**
```json
{ "type": "textFormField", "props": { "label": "الاسم", "name": "name" } }
```

**Verified:** `TextFormFieldRenderer` reads `properties['id']` to register the field in `FormStateStore` (`text_form_field_renderer.dart:24`). The schema lists `id`, not `name` (`component_schemas.dart:479`). Production config uses `id` everywhere (`mobile_production_v2.json:433` `"id": "phone"`, `:462` `"id": "fullName"`).

**Impact:** `name` is never read. The field renders, but its value is stored under an auto-generated hash key (`field_<hashCode>`). On submit, the form payload will **not** contain the field under `"name"` — the value is effectively lost. This breaks any form the converter produces.

**Fix — use `id` for every field:**
```json
{
  "id": "contact-field-3",
  "type": "textFormField",
  "props": {
    "id": "name",
    "label": "الاسم",
    "validateRequired": true
  }
}
```

Apply the same to the email field (`"id": "email"`, `"keyboardType": "email"`, `"validateEmail": true`, `"textDirection": "ltr"`) and message field (`"id": "message"`, `"maxLines": 5`, `"minLines": 3`).

---

### C2 — `scaffold` must never be emitted

**Location:** Section 2 (valid types), Section 11 checklist

**Current:** Section 2 lists `scaffold` as a valid output type.

**Verified:** `scaffold` is an engine-internal type. The page root is auto-derived by `VariantConfigParser` from **page-level keys** (`background`, `scroll`, `padding`) — the parser injects `pageScroll` from `pages[].scroll` (`component_schemas.dart:77`, `scaffold_renderer.dart:16`). The production config contains **zero** `scaffold` nodes. The scaffold renderer wraps its child in a `ColoredBox` + scroll view; if the converter emits a `scaffold` node **inside** `body[]`, the page already provides scroll/background from page-level keys, so you get a redundant scroll wrapper nested inside the page scroll — nested-scroll layout bugs.

**Fix:** Remove `scaffold` from Section 2. Control page background/scroll with the page-object keys (`background`, `scroll: "vertical" | "none"`) as Section 7 already documents — never a node.

Corrected Section 2 first row:

| Category | Types |
|----------|-------|
| Scroll | `singleChildScrollView` *(legacy; prefer page-level `scroll`)* |

---

## 🟡 Important

---

### I1 — Shadow system is undocumented

**Location:** absent

**Verified:** `container`, `button`, and `textFormField` accept a `shadow` preset (`component_schemas.dart:64,275,528`; `shadow_parser.dart`). Production uses it heavily (`mobile_production_v2.json:490,638,970` `"shadow": "lg"`, `:980` `"shadow": "xl"`). Without this mapping the converter silently drops all web `box-shadow` styling.

**Tokens** (from `shadow_tokens.dart`):

| Token | Weight | Typical use |
|-------|--------|-------------|
| `"none"` | none | Explicitly remove a themed default shadow |
| `"sm"` | ~4% / 8px blur | Small cards, chips, form fields |
| `"md"` | ~8% / 16px blur | Filter bars, floating elements |
| `"lg"` | ~12% / 24px blur | Featured cards, panels |
| `"xl"` | ~16% / 32px blur | Modals, checkout dock |

**Add to Section 5** a CSS box-shadow → token approximation table, and note **only** `container`, `button`, `textFormField` read it. `card` uses `elevation` (Section 6.13) — leave that as-is.

```json
{ "type": "container", "props": { "color": "#ffffff", "borderRadius": 12, "shadow": "md" } }
```

---

### I2 — G4/G5 are stated as engine rules, but the engine accepts both forms

**Location:** Section 4 (G4, G5); Section 11 checklist items 4 and 10

**Verified against `variant_config_parser.dart`:**
- `_normalizeBuilderProperties` merges a node-level `style` object into props for exactly these keys: `padding`, `margin`, `borderRadius`, `border`, `shadow`, `background`(→`color`), `color`, `width`, `height` (`:273-296`).
- It also normalizes `crossAxis`→`crossAxisAlignment`, `mainAxis`→`mainAxisAlignment`, `align`→`textAlign` (`:305-313`).

So labeling those alternate forms "Wrong" is factually incorrect. The converter emitting the canonical/flat forms is good practice, but the mobile team must not reject hand-authored JSON that uses them.

**Fix — reframe as converter preference, not engine rejection:**

> **G4 — Prefer flat `props`.** The engine also accepts a `style` sub-object, but only for: `padding`, `margin`, `borderRadius`, `border`, `shadow`, `background`/`color`, `width`, `height`. Any other key inside `style` is dropped. The converter emits flat props.

> **G5 — Prefer canonical alignment names.** The engine also normalizes shorthand `mainAxis`/`crossAxis`/`align` → `mainAxisAlignment`/`crossAxisAlignment`/`textAlign`. The converter emits the canonical names.

Update checklist items 4 and 10 to say "prefer" rather than "must not".

---

### I3 — `appBar.showBackButton` is a dead prop

**Location:** Section 7 (`appBar` structure and field table)

**Current:** Spec emits `"showBackButton": true` for any route ≠ `/home`, and documents the condition.

**Verified:** `AppBarRenderer` never reads `showBackButton` (0 occurrences in `app_bar_renderer.dart`; not in the appBar schema). The back button is shown **automatically** when `GoRouter.canPop()` is true (`app_bar_renderer.dart:98,190`). Emitting `showBackButton` has no effect and misleads readers into thinking it's required.

**Fix:** Remove `showBackButton` from the appBar output and from the field table. Add a note: *"The back arrow appears automatically when the navigation stack can pop — no prop controls it."* Note it renders on the visual **right** in RTL (bar layout is internally LTR).

---

### I4 — `openContact` / `formAdjust` actions are undocumented

**Location:** no action-type reference exists

**Verified:** both are registered in `action_dispatcher.dart` (`openContact` `:95`, `formAdjust` `:101`).

**`openContact`** — launches a contact URI from a normal `button` (use when you want button styling rather than the channel-colored `contactButton`):
```json
{ "type": "openContact", "channel": "tel", "target": "+966501234567" }
```
Valid `channel`: `whatsapp | tel | sms | email | url`.

**`formAdjust`** — sets a form field value programmatically (e.g. a dropdown pre-filling another field):
```json
{ "type": "formAdjust", "field": "phonePrefix", "value": "+966" }
```

---

### I5 — `stack` child positioning props are undocumented

**Location:** Section 6.12 (Hero) uses `stack` but shows only `"fit"`

**Verified** (`stack_renderer.dart`, `component_schemas.dart:609-612`). These are **per-child** props (on the child node's `props`):

| Prop | Notes |
|------|-------|
| `stackLayer` | `"fill"` (index 0 default) \| `"positioned"` (default for others) |
| `stackAlign` | alignment when positioned (default `"bottomCenter"`) |
| `stackInsetBottom` | fixed px from bottom — preferred for footers/docks |
| `stackWidthFactor` | width as fraction of stack (`1` = full width) |

Without these, every non-background child of a Hero/Section stack lands at the default bottom-center position.

---

### I6 — `appBar` toggle-icon (wishlist/favorite) props are undocumented

**Location:** Section 7 appBar field table

**Verified** (`app_bar_renderer.dart:71-85`, `component_schemas.dart:387-420`). Needed for the product-detail favorite toggle:

| Prop | Notes |
|------|-------|
| `trailingIconActivePath` | dataContext boolean path (e.g. `wishlist.isCurrentProductFavorite`) |
| `trailingIconActive` / `trailingIconInactive` | icon names for on/off (defaults `favorite` / `favorite_outline`) |
| `trailingActiveColor` | icon hex when active |
| `trailingAction` | tap action |
| `cartVisiblePath` / `cartVisibleWhen` | conditional cart-icon visibility |
| `titleAlign` | `start` (default) \| `center` \| `end` |

**RTL layout note:** appBar is internally LTR — cart + trailing icons render on the visual **left**, menu/back on the visual **right**. This is intended for Arabic apps.

---

## 🟢 Minor

---

### M1 — `contactButton` (optional enhancement for explicit contact links)

**Location:** Section 6.5 / Section 2

`contactButton` exists (`component_schemas.dart:289`, `contact_button_renderer.dart`) with per-channel default colors and icons (verified in `contact_channel_style.dart`):

| Channel | Background | Icon |
|---------|-----------|------|
| `whatsapp` | `#25D366` | `phone` |
| `tel` | `#1D4ED8` | `phone` |
| `sms` | `#0F172A` | `sms` |
| `email` | `#475569` | `mail` |
| `url` | `#1D4ED8` | `help_outline` |

Required props: `channel` + `label`; default `fullWidth: true`.

**This is optional, not a fix.** A normal `button` with `tap: { type: openContact }`, or even an `openUrl` to a `tel:`/`mailto:` URL, already works — `url_launcher` handles those schemes. Only emit `contactButton` when the link target is unambiguously a contact URI (`tel:`, `sms:`, `mailto:`, `wa.me`) **and** you want the channel styling. Do **not** guess a channel from anything other than the explicit link value.

---

### M2 — Font-weight map: `semibold` currently downgrades to bold

**Location:** Section 5 font-weight map, Section 6.2 heading table

**Verified `parseFontWeight` (`property_parsers.dart:141-168`).** Accepted values — and nothing else:

`w100`, `w200`, `w300`/`light`, `w400`/`normal`, `w500`/`medium`, `w600`/`semibold`, `w700`/`bold`, `w800`, `w900`. Anything unknown → `normal`.

Two consequences:
1. **`w600` is valid** — the heading table's h3/h4 `"w600"` is correct; keep it. (The earlier review's claim that `w600` fell through was wrong.)
2. The converter maps web `semibold → "bold"` (w700). That's a genuine over-weighting. Map it to **`"semibold"` or `"w600"`** instead.

⚠️ There is **no** `"semiBold"` (camelCase), `"thin"`, `"extraBold"`, or `"black"` — those fall through to `normal`. Use only the values above.

---

### M3 — `image.alt` is accepted (checklist is too strict)

`ImageRenderer` reads `semanticsLabel`, then falls back to `alt` (`image_renderer.dart:80-86`). Change the checklist from "`semanticsLabel` (not `alt`)" to "prefer `semanticsLabel`; `alt` also accepted".

---

### M4 — `videoPlayer` ignores `loop` and `muted`

Section 6.10 emits `"loop": false, "muted": false`. The videoPlayer schema only has `semanticType`, `autoplay`, `showControls`, `height`, `borderRadius` (`component_schemas.dart:591-601`); `loop`/`muted` are dropped. Harmless, but remove them to keep output honest — or tell us if you need them and we'll add renderer support.

---

### M5 — `timer` conversion rule (redirect only, no assumption)

`timer` is valid (`component_schemas.dart:688`, required `durationMs`). Document it — but **only** emit it when the page input explicitly defines a redirect/delay. Do not invent a redirect target.
```json
{ "id": "splash-timer-1", "type": "timer",
  "props": { "durationMs": 3000,
    "tap": { "type": "navigate", "route": "<page-defined-target>", "navigation_type": "replace" } } }
```

---

### M6 — `imageSlider` advanced props

Undocumented but supported (`component_schemas.dart:616-675`): `enableFullscreenPreview`, `showThumbnails`, `thumbnailSize`, `animationDurationMs`, `indicatorStyle` (`dot`|`pill`), `indicatorPosition` (`top`|`bottom`), `indicatorColor`, `indicatorInactiveColor`. Add to the Section 6.16 prop table for merchants who want galleries.

---

### M7 — `button.enabledPath` / `enabledWhen` (conditional enable)

Supported (`button_renderer.dart:182-190`, `component_schemas.dart:260-261,273-274`). Useful to gate a submit button on form validity:
```json
{ "type": "button", "props": { "label": "تأكيد", "enabledPath": "form.isValid", "enabledWhen": true } }
```

---

### M8 — `textFormField` prop coverage is shallow

Section 6.23 shows only label/hint/id/textDirection. The renderer also supports (`component_schemas.dart:475-582`): `prefixIcon`/`suffixIcon`, `prefixText`/`suffixText`, `clearable`, `obscureText`, `maxLines`/`minLines`, `maxLength`, `shadow`, `onSubmitted`, `validatePhone`, `validatePassword`, `validatePattern`, `requiredMessage`/`validationMessage`. Worth a compact reference table.

---

## Retracted from earlier review

Two items from the first draft were wrong. Recording them so they don't get re-added:

1. **"CategoryListMenu / ProductSearchMenu → emit a navigate button to `/categories` / `/search`."**  
   **Retracted.** This assumed (a) those routes exist in every merchant config and (b) the web component name implies a navigation button. Neither holds — each merchant defines its own pages, and a merchant may have no categories/search screen at all. Emitting a navigate button to a non-existent route is worse than `unsupported` (dead tap / router error).  
   **Keep** the current `unsupported` output. The only improvement worth making is a **clearer warning**, e.g.:  
   *"'CategoryListMenu' has no automatic mobile equivalent. If this merchant has a categories screen, wire a navigate button manually; otherwise omit the block."*  
   Section 10/12 stay as they are.

2. **"heading `w600` is invalid / silently ignored."**  
   **Retracted.** `parseFontWeight` explicitly maps `w600 → FontWeight.w600`. The heading table is correct.

---

## Corrected validation checklist (replaces Section 11)

### Schema / parse
- [ ] All `type` values are from Section 2 — **`scaffold` is NOT valid output**
- [ ] Every node has `id`, `type`, `props`
- [ ] No `child` + `children` on the same node
- [ ] Prefer flat `props`; `style` object only for: `padding`, `margin`, `borderRadius`, `border`, `shadow`, `background`/`color`, `width`, `height`
- [ ] No web block type names in output

### Props / values
- [ ] No `theme-*` strings, no `px` strings, no `colorMode`/`colorTheme`/`colorFixed`
- [ ] Prefer canonical `mainAxisAlignment`/`crossAxisAlignment`/`textAlign` (shorthand is engine-accepted)
- [ ] Font weight ∈ { `w100`–`w900`, `light`, `normal`, `medium`, `semibold`, `bold` } — **no camelCase, no `thin`/`extraBold`/`black`**
- [ ] Web `semibold` → `"semibold"` or `"w600"` (not `"bold"`)
- [ ] Button `variant` ∈ { `elevated`, `filled`, `outlined`, `text` }
- [ ] `image.url` (not `src`); `image.semanticsLabel` or `alt`
- [ ] `text.value` / `richtext.value` (not `text`/`richtext`)
- [ ] `imageSlider.autoPlay` (capital P), `imageSlider.images[].url`
- [ ] `videoPlayer.showControls` / `autoplay` (drop `loop`/`muted` — not read)

### Forms
- [ ] `textFormField` field key is `props.id` (**never `name`**)
- [ ] `form` uses `props.formId` (production also mirrors it as `id`; both accepted, renderer reads `formId` first)
- [ ] Submit button `tap.formId` matches the form's `formId`
- [ ] `form` uses `child` OR `children`, not both

### Actions
- [ ] Navigation/actions on node-level `tap`, never in `props`
- [ ] No `buttonAction`/`link`/`href` in `props`
- [ ] YouTube → `image` + `tap.openUrl`
- [ ] `addToCart` → `cubitCall` cart; `logout` → `cubitCall` auth + `onSuccess` navigate

### Page assembly
- [ ] `appBar` is a page-level key (sibling of `body`), not inside `body[]`
- [ ] No `showBackButton` emitted (back arrow is automatic)
- [ ] No `scaffold` node; page background/scroll via page-level keys
- [ ] `SiteDrawerShell` → page-level `appDrawer`

### API / data
- [ ] Relative paths only; `requestKey` + `requestUrl` flat in `props`
- [ ] `itemBuilder.source` = `dataContext.requests.<requestKey>.data`; cart uses `cart.items`

### Merchant-specific (no assumptions)
- [ ] No hard-coded route targets that may not exist in this merchant's `pages[]`
- [ ] Blocks with no automatic equivalent → `unsupported` + a clear warning (not a guessed navigate button)
