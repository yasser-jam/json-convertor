# Converter Output Specification

**Version:** 2026-08-07 *(retargeted to the mobile block set — see `docs/BLOCKS-MOBILE.md`; earlier revisions per mobile team reviews `CONVERTER-SPEC-REVIEW-2026-07-01.md`, `CONVERTER-SPEC-REVIEW-2026-07-03 (1).md`, `CONVERTER-SPEC-REVIEW-2026-07-05.md`)*  
**Source file:** `lib/transformer.ts` → `transformWebToMobile()`  
**Web input source of truth:** [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md)  
**Audience:** Mobile engine team — Flutter SDUI renderers, schema validation, Dart model generation  
**Purpose:** Authoritative description of every JSON shape the converter emits. Use this document as the single source of truth when building renderers, writing Dart schemas, and validating converter output.

> **Scope:** This document describes **mobile output only**. Web JSON (Puck blocks) is never forwarded to the engine as-is. The converter transforms every web block type into the mobile primitives listed below.

> ### Input scope — the mobile block set
>
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md) defines the **mobile block set**: the 22 web block
> types the mobile Site JSON registry accepts. **Author every new example from that list and nothing
> else.** [`docs/BLOCKS.md`](docs/BLOCKS.md) is the wider web reference and is **legacy** here.
>
> **Mobile block set (22):** `Accordion`, `Blank`, `ButtonGroup`, `Chip`, `ContentButton`,
> `ContentDivider`, `ContentHeading`, `ContentIcon`, `ContentImage`, `ContentInput`, `ContentLink`,
> `ContentParagraph`, `ContentSwitch`, `Flex`, `Grid`, `Group`, `ImageGallery`, `Section`,
> `Testimonials`, `VideoEmbed`, `ZoneDrawer`, `ZoneBottomSheet`.
>
> Every one of these is documented in [§ 6A](#6a--mobile-block-set). Blocks outside the set still
> convert — merchant payloads predating the mobile registry contain them — but they are grouped in
> [§ 6B](#6b--legacy-web-blocks-not-in-the-mobile-block-set) and marked **LEGACY**. `SiteHeader` and
> `SiteFooter` are a special case: not in the block set, but they are **site zones** that still drive
> `appBar` and `pages[].footer` ([§ 7](#7-page-envelope-structure)), so their ingest rules are live.
>
> Two worked reference payloads, both also available as presets in the converter playground:
> [§ 14](#14-worked-example-a--three-page-commerce-site-json) — a three-page commerce site
> (`home` · `login` · `products`) on the default theme, and
> [§ 15](#15-worked-example-b--two-page-content-site-custom-theme) — a two-page content site
> (`about us` · `login`) on a fully customised serif theme.

---

## Table of Contents

1. [Input formats accepted](#1-input-formats-accepted)
2. [Valid mobile output types](#2-valid-mobile-output-types)
3. [Web type aliases](#3-web-type-aliases)
4. [Global rules (apply to every node)](#4-global-rules)
5. [Token resolution tables](#5-token-resolution-tables)
6. [Block transformations with examples](#6-block-transformations)
   - [6A — Mobile block set](#6a--mobile-block-set)
   - [6B — Legacy web blocks](#6b--legacy-web-blocks-not-in-the-mobile-block-set)
7. [Page envelope structure](#7-page-envelope-structure)
8. [Locale rules](#8-locale-rules)
9. [Data-bound blocks (API-connected)](#9-data-bound-blocks)
10. [Unsupported blocks](#10-unsupported-blocks)
11. [Validation checklist](#11-validation-checklist)
12. [Known limitations](#12-known-limitations)
13. [Block convertibility matrix](#13-block-convertibility-matrix)
14. [Worked example A — three-page commerce Site JSON](#14-worked-example-a--three-page-commerce-site-json)
15. [Worked example B — two-page content site, custom theme](#15-worked-example-b--two-page-content-site-custom-theme)

---

## 1. Input Formats Accepted

The transformer accepts the shapes below. **`1e` is the real web payload** — the editor's `store_config.json` / `SiteData` object; `1c`/`1d` remain supported for fixtures and unit tests.

### 1a — Single block object

```json
{ "type": "Section", "props": { ... } }
```

Output: a single converted node.

### 1b — Array of blocks

```json
[
  { "type": "Hero", "props": { ... } },
  { "type": "Section", "props": { ... } }
]
```

Output: an array of converted nodes.

### 1c — Page object (recommended for full pages)

```json
{
  "path": "/home",
  "label": "Home",
  "rootProps": {
    "direction": "rtl",
    "language": "ar",
    "primary": "#0b78c5",
    "surface": "#f6f8fc",
    "text": "#14243f",
    "neutral": "#6b7d93",
    "bodyFont": "dm-sans",
    "headerBrandTitle": "SOOQ",
    "headerBackgroundColor": "#ffffff",
    "headerTextColor": "#0f172a",
    "headerShowDrawerButton": "on"
  },
  "blocks": [ ... ]
}
```

Output: full app config envelope (see [Section 7](#7-page-envelope-structure)).

### 1d — Array of page objects

An array of page objects produces a multi-page app config with the full envelope.

### 1e — Web `SiteData` / Puck `UserData` (the real merchant payload)

```json
{
  "root": { "props": { "direction": "rtl", "language": "ar", "primary": "#0b78c5" } },
  "zones": {
    "root:zone-header": [ { "type": "SiteHeader", "props": { } } ],
    "root:zone-footer": [ { "type": "SiteFooter", "props": { } } ],
    "root:zone-drawer": [ { "type": "ZoneDrawer", "props": { "slot": [ ] } } ],
    "root:zone-popup": [ { "type": "ZonePopup", "props": { "key": "login", "slot": [ ] } } ],
    "root:zone-bottom-sheet": [ ]
  },
  "pages": [
    { "path": "/", "slug": "/", "name": "الرئيسية", "content": [ { "type": "Section", "props": { } } ] }
  ]
}
```

Detected when the payload has `pages[]`, or `root` plus `content[]` / `zones`. Ingest rules:


| Web key                        | Converter handling                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root.props`                   | Becomes `rootProps` for every page — drives `theme` (§7)                                                                                                 |
| `zones`                        | Zone keys canonicalised (`root:zone:header`, `zone:header`, `root:shell-left-zone` → `zone-header`, `zone-drawer`), then **applied to every page**       |
| `pages[].path`                 | Page `route` (`/` → `/home`); dynamic routes keep the web path verbatim (`/products/:product-slug`) — the engine resolves `:param` from the repeat item / route params |
| `pages[].title` / `name`       | Page `title`                                                                                                                                             |
| `pages[].content[]`            | Page `body[]`                                                                                                                                            |
| `pages[].background` / `scroll` | Page-level `background` / `scroll` when present                                                                                                          |
| Single-page `content[]`        | Treated as one page at `/`                                                                                                                               |


Zone blocks never land in `body[]`: `SiteHeader` → `appBar`, `SiteFooter` → `pages[].footer`, `ZoneDrawer` → `pages[].appDrawer`, `ZonePopup` / `ZoneBottomSheet` → inlined into `openBottomSheet` on whichever `ContentButton` / `ButtonGroup` item targets their `key`.

**Activation flags are honoured:** `visible: false` (header/footer) and `is_active: false` (overlays) drop the zone, with a warning for overlays.

---

## 2. Valid Mobile Output Types

Every `"type"` field in converter output is one of these registered engine primitives:


| Category      | Types                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Scroll        | `singleChildScrollView` *(legacy; prefer page-level `scroll`)*                                          |
| Layout        | `column`, `row`, `container`, `stack`, `listView`, `gridView`, `sizedBox`                               |
| Content       | `text`, `richtext`, `image`, `icon`, `divider`, `videoPlayer`, `imageSlider`                            |
| Input / forms | `textFormField`, `form`, `button`, `contactButton`, `radioGroup`, `otpInput`, `dropdown`, `switchField` |
| Chrome        | `appBar`, `appDrawer`, `tabs`, `card`, `expansionTile`                                                  |
| Other         | `timer`, `progressIndicator`, `unsupported`                                                             |


Web block type names (`Button`, `Section`, `ContentParagraph`, etc.) **never appear** in converter output.

> `**scaffold` is engine-internal — never emit it.** Page background and scroll are controlled by page-level keys (`background`, `scroll: "vertical" | "none"`, `layout: "centered"`), not by a node in `body[]`. For a static full-screen form, `layout: "centered"` — not `scroll: "none"` ([§ 7.1](#71-auth-and-splash-pages-use-layout-centered-not-scroll-none)).

---

## 3. Web Type Aliases

The converter normalises the following web type names before dispatch. The internal name on the right
is an implementation detail — it **never** appears in output.

**Mobile block set:**


| Web type           | Resolved as                                  |
| ------------------ | -------------------------------------------- |
| `ContentImage`     | `Image`                                      |
| `ContentParagraph` | `Text`                                       |
| `ContentHeading`   | `Heading`                                    |
| `ContentButton`    | `Button`                                     |
| `ContentDivider`   | `Divider`                                    |
| `ContentIcon`      | `Icon`                                       |
| `ContentLink`      | `Link` (→ `button` `variant: "text"`)        |
| `ContentInput`     | `Input` (→ `textFormField`)                  |
| `ContentSwitch`    | `Switch` (→ `switchField`)                   |
| `VideoEmbed`       | `YouTube` (handles both YouTube and MP4/HLS) |


**LEGACY** *(not in the mobile block set — see [§ 6B](#6b--legacy-web-blocks-not-in-the-mobile-block-set)):*


| Web type           | Resolved as                                  |
| ------------------ | -------------------------------------------- |
| `ContentHtml`      | `Html` (→ `richtext`)                        |
| `ProductsGrid`     | `ProductGrid`                                |
| `OrderHistory`     | `OrderList`                                  |
| `RowGroup`         | `Group` *(forced `direction: "row"`)*        |
| `CartItem`         | `Group` *(cart-line binding via `cartLineId`)* |
| `ProductImageCarousel` | `ProductGallery` (→ bound `image`)       |


---

## 4. Global Rules

### G1 — Node shape

Every emitted node has exactly these top-level keys:

```json
{
  "id": "<unique-string>",
  "type": "<mobile-primitive>",
  "props": { ... }
}
```

- `id` is auto-generated as `<prefix>-<counter>`, unique per conversion run.
- Child slots use **either** `"child"` (single node) **or** `"children"` (array) — never both on the same node.
- `"props"` is always present, even if empty (`{}`).

### G2 — `tap` is node-level, never inside `props`

All navigation, actions and links are placed as a **sibling of `props`** on the node.

**Wrong:**

```json
{
  "type": "button",
  "props": {
    "label": "تسوق الآن",
    "buttonAction": "link",
    "link": { "kind": "page", "pageId": "/products" }
  }
}
```

**Correct:**

```json
{
  "id": "button-1",
  "type": "button",
  "props": { "label": "تسوق الآن", "variant": "elevated", "height": 48 },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

`buttonAction`, `link`, `href`, `destinationType` are **never** emitted inside `props`. `onTap` is never emitted at all (runtime-injected).

**Action types reference:**


| `tap.type`         | Shape                                                                                                                                                                                          | Use                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `navigate`         | `{ "type": "navigate", "route": "/path", "navigation_type": "push" | "go" | "replace" }`                                                                                                       | In-app routing                            |
| `openUrl`          | `{ "type": "openUrl", "url": "https://..." }`                                                                                                                                                  | External URL                              |
| `openContact`      | `{ "type": "openContact", "channel": "tel" | "sms" | "email" | "whatsapp" | "url", "target": "+966..." }`                                                                                      | Launch contact URI from a normal `button` |
| `formAdjust`       | `{ "type": "formAdjust", "field": "phonePrefix", "value": "+966" }`                                                                                                                            | Set a form field value programmatically   |
| `cubitCall`        | `{ "type": "cubitCall", "cubit": "cart", "method": "addItem" }`                                                                                                                                | Cubit method call                         |
| `apiCall`          | `{ "type": "apiCall", "method": "POST", "url": "/api/...", "requireValidForm": true, "formId": "..." }`                                                                                        | Form submission                           |
| `openDrawer`       | `{ "type": "openDrawer" }`                                                                                                                                                                     | Open navigation drawer                    |
| `openBottomSheet`  | `{ "type": "openBottomSheet", "child": { ... }, "showDragHandle": true, "isScrollControlled": true, "isDismissible": true, "heightFactor": 0.6, "replaceCurrent": false, "onClose": { ... } }` | Modal sheet with inline component tree    |
| `closeBottomSheet` | `{ "type": "closeBottomSheet" }`                                                                                                                                                               | Close top engine-opened sheet             |


> **Bottom sheet constraint:** sheet content renders from a **snapshot** of dataContext at open time. Use form inputs → `cubitCall` → `onSuccess: closeBottomSheet`. Triggers inside an open sheet that open another sheet must set `"replaceCurrent": true`.

### G2b — `cubitCall` param `source` vocabulary

Each key in `cubitCall.params` resolves from one of these `source` values:


| `source`                       | Reads from                                           |
| ------------------------------ | ---------------------------------------------------- |
| `form`                         | `FormStateStore` field id (`field`)                  |
| `tap`                          | Tap payload (radioGroup / dropdown / tabs selection) |
| `item`                         | Current repeat-item in a list/grid template          |
| `dataContext` / `context`      | Dotted path in `field`                               |
| `pageState` / `page_state`     | `PageStateStore` key                                 |
| `routeParams` / `route_params` | Route parameters                                     |
| `authState`                    | Auth session field                                   |
| `app`                          | `app.`* config values (e.g. `supportWhatsApp`)       |
| `value`                        | Literal: `{ "source": "value", "value": 1 }`         |


> `**source: "data"` is not valid in cubitCall params** — unknown sources fall through to null. `visibleWhen` (§6.31) has its own vocabulary (`form`  `pageState`  `data` / `dataContext`). Do not reuse one in the other.

### G3 — No theme tokens in output

All `"theme-*"` strings, `colorMode`/`colorTheme`/`colorFixed` triples, and `px` strings are resolved to concrete numbers or hex strings at conversion time. See [Section 5](#5-token-resolution-tables).

### G4 — Prefer flat `props`

The converter emits all visual and box-model properties directly in `props`. The engine also accepts a `style` sub-object, but **only** for: `padding`, `margin`, `borderRadius`, `border`, `shadow`, `background`/`color`, `width`, `height`. Any other key inside `style` is dropped.

**Converter output (preferred):** `"props": { "color": "#fff", "padding": { "top": 32 } }`

### G5 — Prefer canonical alignment names

The converter emits canonical names. The engine also normalizes shorthand `mainAxis`/`crossAxis`/`align` → `mainAxisAlignment`/`crossAxisAlignment`/`textAlign`.


| Shorthand (engine-accepted) | Canonical (converter emits)       |
| --------------------------- | --------------------------------- |
| `"mainAxis": "center"`      | `"mainAxisAlignment": "center"`   |
| `"crossAxis": "stretch"`    | `"crossAxisAlignment": "stretch"` |
| `"align": "right"`          | `"textAlign": "right"`            |


Valid `mainAxisAlignment` values: `start`, `center`, `end`, `spaceBetween`, `spaceAround`, `spaceEvenly`  
Valid `crossAxisAlignment` values: `start`, `center`, `end`, `stretch`, `baseline`

### G6 — Numeric props are JSON numbers


| Wrong                | Correct                                         |
| -------------------- | ----------------------------------------------- |
| `"columns": "4"`     | `"crossAxisCount": 4`                           |
| `"gap": "md"`        | `"mainAxisSpacing": 12, "crossAxisSpacing": 12` |
| `"thickness": "1px"` | `"thickness": 1`                                |


---

## 5. Token Resolution Tables

### Typography / spacing tokens


| Web token                 | Resolved number | Context                              |
| ------------------------- | --------------- | ------------------------------------ |
| `theme-xs`                | `12`            | fontSize                             |
| `theme-xs`                | `4`             | spacing / borderRadius               |
| `theme-sm`                | `14`            | fontSize                             |
| `theme-sm`                | `8`             | spacing / borderRadius               |
| `theme-md`                | `16`            | fontSize / spacing / borderRadius    |
| `theme-lg`                | `18`            | fontSize                             |
| `theme-lg`                | `24`            | spacing / borderRadius               |
| `theme-xl`                | `22`            | fontSize                             |
| `theme-xl`                | `36`            | spacing / borderRadius               |
| `theme-2xl` / `theme-xxl` | `28`            | fontSize                             |
| `theme-none`              | `0`             | borderRadius                         |
| `theme-full`              | `999`           | borderRadius                         |
| `theme-4`                 | `4`             | spacing                              |
| `theme-8`                 | `8`             | spacing                              |
| `theme-16`                | `16`            | spacing                              |
| `theme-24`                | `24`            | spacing                              |
| `theme-40`                | `40`            | spacing                              |
| `theme-315`               | `315`           | height                               |
| `theme-480`               | `480`           | height                               |
| `theme-5`                 | `5000`          | `intervalMs` (autoplay milliseconds) |
| `"60px"`                  | `60`            | any numeric prop (px stripped)       |


> ### ⚠️ Known deviation — radius tokens resolve on the spacing scale
>
> `theme-sm/md/lg/xl` in a **borderRadius** position currently resolve to the **spacing** numbers in
> the table above (`8 / 16 / 24 / 36`), *not* to a separate radius scale (`4 / 8 / 12 / 16`), and
> `rootProps.radiusSm` / `radiusMd` / `radiusLg` / `radiusXl` are **ignored**. `resolveThemePx()`
> matches its spacing map before its radius map, so the radius branch is unreachable for these four
> keys. `theme-none` → `0` and `theme-full` → `999` are unaffected.
>
> Renderers should treat the emitted number as authoritative and not try to re-derive it from the
> theme. This deviation is tracked for a fix; when it lands, this table changes to the radius scale
> and the override note returns.

### Gap token map


| Web `gap` | Mobile number |
| --------- | ------------- |
| `sm`      | `8`           |
| `md`      | `12`          |
| `lg`      | `16`          |
| `xl`      | `24`          |


### Color triple → hex


| Web                                           | Mobile                             |
| --------------------------------------------- | ---------------------------------- |
| `colorMode: "theme"`, `colorTheme: "primary"` | `rootProps.primary` or `"#0b78c5"` |
| `colorMode: "theme"`, `colorTheme: "surface"` | `rootProps.surface` or `"#ffffff"` |
| `colorMode: "theme"`, `colorTheme: "text"`    | `rootProps.text` or `"#0f172a"`    |
| `colorMode: "theme"`, `colorTheme: "neutral"` | `rootProps.neutral` or `"#64748b"` |
| `colorMode: "theme"`, `colorTheme: "error"`   | `rootProps.error` or `"#ef4444"`   |
| `colorMode: "theme"`, `colorTheme: "success"` | `rootProps.success` or `"#0f9d73"` |
| `colorMode: "theme"`, `colorTheme: "warning"` | `rootProps.warning` or `"#c77a15"` |
| `colorMode: "theme"`, `colorTheme: "dark"`    | `rootProps.dark` or `"#10213a"`    |
| `colorMode: "fixed"`, `colorFixed: "#hex"`    | `"#hex"` (pass-through)            |


`colorMode`, `colorTheme`, `colorFixed` are **never** emitted in output.

### Button variant map


| Web `variant` / `buttonVariant` | Mobile `props.variant` |
| ------------------------------- | ---------------------- |
| `primary`                       | `elevated`             |
| `secondary`                     | `outlined`             |
| `outline`                       | `outlined`             |
| `ghost`                         | `text`                 |
| `danger`                        | `filled`               |
| *(any other / missing)*         | `elevated`             |


### Button size → height


| Web `size`       | Mobile `props.height` |
| ---------------- | --------------------- |
| `sm`             | `36`                  |
| `md` *(default)* | `48`                  |
| `lg`             | `56`                  |


### Aspect ratio map


| Web `aspectRatio`    | Mobile number |
| -------------------- | ------------- |
| `square` / `1:1`     | `1.0`         |
| `landscape` / `16:9` | `1.777`       |
| `portrait`           | `0.75`        |
| `wide` / `21:9`      | `2.333`       |
| `4:3`                | `1.333`       |


### Font weight map


| Web `fontWeight`                   | Mobile `fontWeight`      |
| ---------------------------------- | ------------------------ |
| `theme-light` / `light` / `normal` | `"normal"`               |
| `theme-normal`                     | `"normal"`               |
| `theme-semibold` / `semibold`      | `"semibold"` or `"w600"` |
| `theme-bold` / `bold`              | `"bold"`                 |
| `medium`                           | `"medium"`               |


Accepted engine values: `w100`–`w900`, `light`, `normal`, `medium`, `semibold`, `bold`. Anything else (e.g. `semiBold`, `thin`, `extraBold`, `black`) falls through to `normal`.

### Web flex alignment → mobile


| Web `justifyContent` / `alignItems` | Mobile value   |
| ----------------------------------- | -------------- |
| `flex-start`, `start`               | `start`        |
| `center`                            | `center`       |
| `flex-end`, `end`                   | `end`          |
| `space-between`, `spaceBetween`     | `spaceBetween` |
| `space-around`, `spaceAround`       | `spaceAround`  |
| `space-evenly`, `spaceEvenly`       | `spaceEvenly`  |
| `stretch`                           | `stretch`      |
| `baseline`                          | `baseline`     |


### Shadow token map

Accepted by `container`, `button`, and `textFormField` only. (`card` uses `elevation` — not `shadow`.)


| Token    | Approximate CSS equivalent | Typical use                        |
| -------- | -------------------------- | ---------------------------------- |
| `"none"` | no shadow                  | Explicitly remove a themed default |
| `"sm"`   | ~4 % opacity / 8 px blur   | Small cards, chips, form fields    |
| `"md"`   | ~8 % opacity / 16 px blur  | Filter bars, floating elements     |
| `"lg"`   | ~12 % opacity / 24 px blur | Featured cards, panels             |
| `"xl"`   | ~16 % opacity / 32 px blur | Modals, checkout dock              |


**CSS `box-shadow` → token approximation:**


| CSS shadow                               | Token    |
| ---------------------------------------- | -------- |
| `none`                                   | `"none"` |
| `0 1px 4px rgba(0,0,0,0.08)` or smaller  | `"sm"`   |
| `0 4px 12px rgba(0,0,0,0.12)`            | `"md"`   |
| `0 8px 24px rgba(0,0,0,0.16)`            | `"lg"`   |
| `0 16px 40px rgba(0,0,0,0.20)` or larger | `"xl"`   |


```json
{ "type": "container", "props": { "color": "#ffffff", "borderRadius": 12, "shadow": "md" } }
```

### Lucide icon → Material icon name


| Lucide                          | Material         |
| ------------------------------- | ---------------- |
| `shield-check`, `ShieldCheck`   | `verified_user`  |
| `truck`, `Truck`                | `local_shipping` |
| `heart`, `Heart`                | `favorite`       |
| `star`, `Star`                  | `star`           |
| `shopping-cart`, `ShoppingCart` | `shopping_cart`  |
| `menu`, `Menu`                  | `menu`           |
| `search`, `Search`              | `search`         |
| `user`, `User`                  | `person`         |
| `arrow-right`, `ArrowRight`     | `arrow_forward`  |
| `arrow-left`, `ArrowLeft`       | `arrow_back`     |
| `check-circle`                  | `check_circle`   |
| `alert-circle`                  | `error_outline`  |
| `x`, `X`, `close`               | `close`          |
| `home`, `Home`                  | `home`           |
| `bell`, `Bell`                  | `notifications`  |
| `mail`, `Mail`                  | `email`          |
| `phone`, `Phone`                | `phone`          |
| `map-pin`, `MapPin`             | `location_on`    |
| `clock`, `Clock`                | `access_time`    |
| `check`, `Check`                | `check`          |
| `info`, `Info`                  | `info`           |
| `edit`, `Edit`, `pencil`        | `edit`           |
| `settings`, `Settings`          | `settings`       |
| `trash`, `Trash`                | `delete`         |
| `plus`, `Plus`                  | `add`            |
| `minus`, `Minus`                | `remove`         |
| `calendar`                      | `calendar_today` |
| `tag`                           | `label`          |
| `eye`                           | `visibility`     |
| `share`                         | `share`          |
| `filter`                        | `filter_list`    |
| *unknown*                       | `help_outline`   |


---

## 6. Block Transformations

Each subsection shows the web input (what the converter receives) and the exact mobile output it emits.

Subsections are grouped by whether the web block type is in the **mobile block set**
([`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md)). Numbers are stable across this regrouping, so
existing references such as “§ 6.12” still resolve — they are simply no longer in numeric order.

---

## 6A — Mobile block set

The 22 block types the mobile Site JSON registry emits. **Author every new example from this list.**

| Block | Subsection | Mobile output |
| --- | --- | --- |
| `Accordion` | [§ 6.15](#615-accordion) | `column` of `expansionTile` |
| `Blank` | [§ 6.28](#628-blank) | *omitted* |
| `ButtonGroup` | [§ 6.36](#636-buttongroup) | `row` of `button` (static only) |
| `Chip` | [§ 6.37](#637-chip) | *skipped + warning* |
| `ContentButton` | [§ 6.5](#65-button--contentbutton) | `button` + node-level `tap` |
| `ContentDivider` | [§ 6.9](#69-divider--contentdivider) | `divider` |
| `ContentHeading` | [§ 6.2](#62-heading--contentheading) | `text` |
| `ContentIcon` | [§ 6.7](#67-icon--contenticon) | `icon` |
| `ContentImage` | [§ 6.8](#68-image--contentimage) | `image` |
| `ContentInput` | [§ 6.34](#634-contentinput) | `textFormField` (+ `form` wrapper) |
| `ContentLink` | [§ 6.6](#66-link) | `button` `variant: "text"` |
| `ContentParagraph` | [§ 6.1](#61-text--contentparagraph) | `text` |
| `ContentSwitch` | [§ 6.35](#635-contentswitch) | `switchField` |
| `Flex` | [§ 6.18](#618-group--flex) | `row` / `column` |
| `Grid` | [§ 6.19](#619-grid-layout) | `gridView` |
| `Group` | [§ 6.18](#618-group--flex) | `row` / `column` (+ `container` when styled) |
| `ImageGallery` | [§ 6.16](#616-imagegallery-slider-mode) | `imageSlider` / `gridView` |
| `Section` | [§ 6.17](#617-section) | `container` + `column` / `gridView` / `stack` |
| `Testimonials` | [§ 6.25](#625-testimonials) | `column` of `card` / horizontal `listView` |
| `VideoEmbed` | [§ 6.11](#611-videoembed-youtube) | `image` + `openUrl`, or `videoPlayer` |
| `ZoneDrawer` | [§ 6.38](#638-zonedrawer--zonebottomsheet) | page-level `appDrawer` |
| `ZoneBottomSheet` | [§ 6.38](#638-zonedrawer--zonebottomsheet) | `tap.openBottomSheet.child` |

Sections [§ 6.29](#629-timer)–[§ 6.32](#632-switchfield) document mobile primitives with no 1:1 web block
(`timer`, `radioGroup`, `visibleWhen`, `switchField`) — emit them when hand-authoring, and read
[§ 6.32](#632-switchfield) as the prop reference behind [§ 6.35](#635-contentswitch).

---

### 6.1 Text / ContentParagraph

**Web input:**

```json
{
  "type": "ContentParagraph",
  "props": {
    "text": "نحن نقدم أفضل المنتجات",
    "fontSize": "theme-md",
    "fontWeight": "theme-light",
    "color": "theme-text",
    "align": "right"
  }
}
```

**Mobile output:**

```json
{
  "id": "text-1",
  "type": "text",
  "props": {
    "value": "نحن نقدم أفضل المنتجات",
    "fontSize": 16,
    "fontWeight": "normal",
    "color": "#0f172a",
    "textAlign": "right"
  }
}
```

**Field mapping:**


| Web field            | Mobile field          | Notes                              |
| -------------------- | --------------------- | ---------------------------------- |
| `text`               | `value`               | required rename                    |
| `align`              | `textAlign`           |                                    |
| `fontSize` (token)   | `fontSize` (number)   | resolved                           |
| `fontWeight` (token) | `fontWeight` (string) | resolved                           |
| `color` (token)      | `color` (hex)         | resolved                           |
| `fontFamily`         | —                     | **deleted** (not in engine schema) |
| `lineHeight`         | —                     | **deleted** (not in engine schema) |


> If the `text` value contains HTML tags, the node type is automatically promoted to `richtext` with the raw HTML in `value`.

---

### 6.2 Heading / ContentHeading

**Web input:**

```json
{
  "type": "Heading",
  "props": {
    "text": "منتجاتنا",
    "level": "2",
    "align": "center",
    "colorMode": "theme",
    "colorTheme": "text"
  }
}
```

**Mobile output:**

```json
{
  "id": "heading-1",
  "type": "text",
  "props": {
    "value": "منتجاتنا",
    "fontSize": 22,
    "fontWeight": "bold",
    "textAlign": "center",
    "color": "#0f172a"
  }
}
```

**Heading level → fontSize / fontWeight:**


| Level | `fontSize` | `fontWeight` |
| ----- | ---------- | ------------ |
| h1    | 28         | `bold`       |
| h2    | 22         | `bold`       |
| h3    | 18         | `w600`       |
| h4    | 16         | `w600`       |


> `**w600` is valid** — the engine maps it to `FontWeight.w600`. Do not downgrade to `"bold"`.

---

### 6.5 Button / ContentButton

**Web input:**

```json
{
  "type": "ContentButton",
  "props": {
    "label": "تسوق الآن",
    "labelAr": "تسوق الآن",
    "buttonVariant": "primary",
    "size": "md",
    "fullWidth": "on",
    "buttonAction": "link",
    "link": { "kind": "page", "pageId": "/products" }
  }
}
```

**Mobile output:**

```json
{
  "id": "button-1",
  "type": "button",
  "props": {
    "label": "تسوق الآن",
    "variant": "elevated",
    "fullWidth": true
  },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

> **Button height:** omit `height` for web `size: "md"` (theme default). Emit `height: 36` / `56` only for `sm` / `lg`. Never emit `height` on `contactButton`.

**Supported `button` props:** `label`, `variant`, `height`, `fullWidth`, `color` (from theme), `shadow`, `enabledPath`, `enabledWhen`, `trailingText`, `trailingTextPath`.

**Conditional enable** — gate a button on form validity or data context:

```json
{ "type": "button", "props": { "label": "تأكيد", "enabledPath": "form.isValid", "enabledWhen": true } }
```

`**buttonAction` → `tap` mapping:**


| Web `buttonAction`           | Mobile `tap`                                                                                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `link` + `link.kind: "page"` | `{ "type": "navigate", "route": "<pageId>", "navigation_type": "push" }`                                                                                                                                                                        |
| `link` + `link.kind: "url"`  | `{ "type": "openUrl", "url": "<url>" }`                                                                                                                                                                                                         |
| `href` (internal path)       | `{ "type": "navigate", "route": "<path>", "navigation_type": "push" }`                                                                                                                                                                          |
| `href` (http/https/www)      | `{ "type": "openUrl", "url": "<href>" }`                                                                                                                                                                                                        |
| `login` *(no sibling inputs)* | `{ "type": "navigate", "route": "/auth/login", "navigation_type": "push" }` — entry point to the engine's native auth screen                                                                                                                    |
| `login` *(inside a Section with `ContentInput` fields)* | `{ "type": "cubitCall", "cubit": "auth", "method": "login", "requireValidForm": true, "formId": "login-form", "params": { "<field>": { "source": "form", "field": "<field>" } } }` — the Section becomes a `form`; see [§ 6.34](#auth-forms--the-form-wrapper) |
| `logout`                     | `{ "type": "cubitCall", "cubit": "auth", "method": "logout", "onSuccess": { "type": "navigate", "route": "/auth/login", "navigation_type": "go" } }`                                                                                            |
| `addToCart`                  | `{ "type": "cubitCall", "cubit": "cart", "method": "addItem" }`                                                                                                                                                                                 |
| `addToWishlist`              | `{ "type": "navigate", "route": "/wishlist", "navigation_type": "push" }`                                                                                                                                                                       |
| `makeOrder`                  | `{ "type": "cubitCall", "cubit": "checkout", "method": "placeOrder" }` — optional `params.guestEmail` from guest contact form (§6.33)                                                                                                           |
| `cartQtyIncrease`            | `{ "type": "cubitCall", "cubit": "cart", "method": "updateQuantity", "params": { "variantId": { "source": "item", "field": "variantId" }, "delta": { "source": "value", "value": 1 } } }`                                                       |
| `cartQtyDecrease`            | Same as `cartQtyIncrease` with `"value": -1`                                                                                                                                                                                                    |
| `verifyOtp`                  | `{ "type": "cubitCall", "cubit": "auth", "method": "verifyOtp", "requireValidForm": true, "formId": "otp-verify-form", "params": { "phone": { "source": "authState", "field": "phone" } } }` — OTP code from form field `otpCode` automatically |


**Cart remove line** (inside cart line template): `{ "type": "cubitCall", "cubit": "cart", "method": "removeItem", "params": { "variantId": { "source": "item", "field": "variantId" } } }`

> Never emit `increaseQuantity`, `decreaseQuantity`, or `lineId` in cart cubitCall params.

> `buttonAction`, `link`, `href`, `destinationType` are **never** emitted inside `props`. Web `destinationType: "zone"` maps to `openBottomSheet`, `openDrawer`, or `navigate` when the zone key is known.

### 6.5b ContactButton (optional)

Emit `contactButton` only when the link target is unambiguously a contact URI (`tel:`, `sms:`, `mailto:`, `wa.me`) **and** channel styling is desired. A normal `button` with `tap: { type: "openContact" }` or `tap: { type: "openUrl" }` to a `tel:`/`mailto:` URL also works.

Required props: `channel` + `label` + (`target` or `targetPath`). Default `fullWidth: true`. **Never emit `height` on `contactButton`.**

The renderer requires `props.target` (or `targetPath`) for enabled state — the node-level `tap` alone is not enough.


| Channel    | Background | Icon           |
| ---------- | ---------- | -------------- |
| `whatsapp` | `#25D366`  | `phone`        |
| `tel`      | `#1D4ED8`  | `phone`        |
| `sms`      | `#0F172A`  | `sms`          |
| `email`    | `#475569`  | `mail`         |
| `url`      | `#1D4ED8`  | `help_outline` |


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

> Same `target` value in both `props` and `tap`.

---

### 6.6 Link

A `Link` block becomes a `button` with `variant: "text"` (web `ghost` → `"text"` per §5 variant map). Never emit literal `"ghost"` in output.

```json
{
  "id": "link-1",
  "type": "button",
  "props": { "label": "تفاصيل", "variant": "text" },
  "tap": { "type": "navigate", "route": "/about", "navigation_type": "push" }
}
```

---

### 6.7 Icon / ContentIcon

**Web input:**

```json
{
  "type": "ContentIcon",
  "props": {
    "icon": "shield-check",
    "size": 48,
    "colorMode": "theme",
    "colorTheme": "primary"
  }
}
```

**Mobile output:**

```json
{
  "id": "icon-1",
  "type": "icon",
  "props": { "name": "verified_user", "size": 48, "color": "#0b78c5" }
}
```

Unknown Lucide icons resolve to `help_outline`.

---

### 6.8 Image / ContentImage

**Web input:**

```json
{
  "type": "ContentImage",
  "props": {
    "src": "https://example.com/banner.jpg",
    "alt": "صورة البانر",
    "objectFit": "cover",
    "radius": "theme-lg",
    "aspectRatio": "landscape"
  }
}
```

**Mobile output:**

```json
{
  "id": "image-1",
  "type": "image",
  "props": {
    "url": "https://example.com/banner.jpg",
    "source": "network",
    "semanticsLabel": "صورة البانر",
    "fit": "cover",
    "borderRadius": 12,
    "aspectRatio": 1.777
  }
}
```


| Web field              | Mobile field                 | Notes                                                                            |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `src`                  | `url`                        | required rename                                                                  |
| —                      | `source: "network"`          | always set                                                                       |
| `alt`                  | `semanticsLabel`             | prefer `semanticsLabel`; engine also accepts `alt`                               |
| `objectFit`            | `fit`                        |                                                                                  |
| `radius` (token)       | `borderRadius` (number)      | resolved                                                                         |
| `aspectRatio` (string) | `aspectRatio` (number)       | resolved                                                                         |
| `width` / `height`     | `width` / `height` (numbers) | px stripped                                                                      |
| `align`, `maxWidth`    | —                            | wrap caller in `container` instead                                               |
| `valueContext.path`    | `urlPath`                    | see §9.5 — use static `semanticsLabel` / `alt` for a11y; no `semanticsLabelPath` |


---

### 6.9 Divider / ContentDivider

**Web input:**

```json
{ "type": "ContentDivider", "props": { "thickness": "1px", "colorMode": "theme", "colorTheme": "neutral" } }
```

**Mobile output:**

```json
{
  "id": "divider-1",
  "type": "divider",
  "props": { "thickness": 1, "color": "#64748b" }
}
```

- `orientation: "vertical"` → emits a `container` with `width: 1` instead of a `divider`.
- `variant: "dashed"` → dashed line using existing `thickness`/`color`/`height`. Web dashed/dotted dividers emit this.

---

### 6.11 VideoEmbed (YouTube)

YouTube URLs are converted to a thumbnail image with an `openUrl` tap.

**Web input:**

```json
{ "type": "VideoEmbed", "props": { "src": "https://www.youtube.com/watch?v=ABC123" } }
```

**Mobile output:**

```json
{
  "id": "youtube-thumb-1",
  "type": "image",
  "props": {
    "url": "https://img.youtube.com/vi/ABC123/hqdefault.jpg",
    "source": "network",
    "aspectRatio": 1.777,
    "fit": "cover"
  },
  "tap": { "type": "openUrl", "url": "https://www.youtube.com/watch?v=ABC123" }
}
```

YouTube is **never** emitted as `videoPlayer` (Flutter `video_player` does not support YouTube).

### 6.11b VideoEmbed (MP4 / HLS)

Non-YouTube `VideoEmbed` is treated the same as a `Video` block:

```json
{
  "id": "video-1",
  "type": "videoPlayer",
  "props": {
    "url": "https://example.com/video.mp4",
    "showControls": true,
    "autoplay": false
  }
}
```

---

### 6.15 Accordion

**Web input:**

```json
{
  "type": "Accordion",
  "props": {
    "heading": "الأسئلة الشائعة",
    "variant": "soft",
    "items": [
      { "title": "كم يستغرق التوصيل؟", "body": "2-4 أيام عمل", "open": true },
      { "title": "كيف أتتبع طلبي؟", "body": "عبر تطبيقنا" }
    ]
  }
}
```

**Mobile output:**

```json
{
  "id": "accordion-1",
  "type": "column",
  "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 0 },
  "children": [
    {
      "id": "accordion-heading-2",
      "type": "text",
      "props": { "value": "الأسئلة الشائعة", "fontSize": 18, "fontWeight": "bold" }
    },
    {
      "id": "accordion-item-3",
      "type": "expansionTile",
      "props": {
        "title": "كم يستغرق التوصيل؟",
        "initiallyExpanded": true,
        "backgroundColor": "#f8fafc",
        "borderRadius": 8,
        "showDivider": true
      },
      "children": [
        { "id": "accordion-body-4", "type": "text", "props": { "value": "2-4 أيام عمل", "fontSize": 14 } }
      ]
    },
    {
      "id": "accordion-item-5",
      "type": "expansionTile",
      "props": {
        "title": "كيف أتتبع طلبي؟",
        "initiallyExpanded": false,
        "backgroundColor": "#f8fafc",
        "borderRadius": 8,
        "showDivider": true
      },
      "children": [
        { "id": "accordion-body-6", "type": "text", "props": { "value": "عبر تطبيقنا", "fontSize": 14 } }
      ]
    }
  ]
}
```

`**variant` → `expansionTile` styling:**


| Web `variant`      | `expansionTile` props                                                |
| ------------------ | -------------------------------------------------------------------- |
| `soft` *(default)* | `backgroundColor: "#f8fafc"`, `borderRadius: 8`, `showDivider: true` |
| `outline`          | wrapped in `container` with border, `showDivider: true`              |
| `minimal`          | `showDivider: false`                                                 |


---

### 6.16 ImageGallery (slider mode)

**Web input:**

```json
{
  "type": "ImageGallery",
  "props": {
    "mode": "slider",
    "images": [
      { "src": "https://example.com/slide1.jpg" },
      { "src": "https://example.com/slide2.jpg" }
    ],
    "aspectRatio": "landscape",
    "autoplay": true,
    "autoplayDuration": "theme-5"
  }
}
```

**Mobile output:**

```json
{
  "id": "gallery-slider-1",
  "type": "imageSlider",
  "props": {
    "images": [
      { "url": "https://example.com/slide1.jpg", "alt": "" },
      { "url": "https://example.com/slide2.jpg", "alt": "" }
    ],
    "aspectRatio": 1.777,
    "fit": "cover",
    "borderRadius": 8,
    "autoPlay": true,
    "intervalMs": 5000,
    "showIndicators": true,
    "indicatorStyle": "dot"
  }
}
```


| Web                           | Mobile             | Notes                                  |
| ----------------------------- | ------------------ | -------------------------------------- |
| `images[].src`                | `images[].url`     | required rename                        |
| `aspectRatio: "landscape"`    | `1.777`            | resolved                               |
| `autoplay`                    | `autoPlay`         | capital P                              |
| `autoplayDuration: "theme-5"` | `intervalMs: 5000` | token × 1000 ms                        |
| `showArrows`, `slidesPerView` | —                  | **not emitted** (not in engine schema) |


**Advanced props** (supported by engine, emitted when web input provides them):


| Prop                      | Values               |
| ------------------------- | -------------------- |
| `enableFullscreenPreview` | boolean              |
| `showThumbnails`          | boolean              |
| `thumbnailSize`           | number (px)          |
| `animationDurationMs`     | number               |
| `indicatorStyle`          | `"dot"` | `"pill"`   |
| `indicatorPosition`       | `"top"` | `"bottom"` |
| `indicatorColor`          | hex string           |
| `indicatorInactiveColor`  | hex string           |


---

### 6.16b ImageGallery (grid mode)

**Mobile output:**

```json
{
  "id": "gallery-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 3,
    "mainAxisSpacing": 16,
    "crossAxisSpacing": 16,
    "childAspectRatio": 1.777
  },
  "children": [
    { "id": "gallery-image-2", "type": "image", "props": { "url": "...", "source": "network", "fit": "cover", "aspectRatio": 1.777, "borderRadius": 8 } }
  ]
}
```

---

### 6.17 Section

**Web input:**

```json
{
  "type": "Section",
  "props": {
    "backgroundColor": "#f8f9fa",
    "paddingTop": "60px",
    "paddingBottom": "60px",
    "paddingHorizontal": "24px",
    "visible": true,
    "content": [ ... ]
  }
}
```

**Mobile output:**

```json
{
  "id": "section-container-1",
  "type": "container",
  "props": {
    "color": "#f8f9fa",
    "padding": { "top": 60, "bottom": 60, "left": 24, "right": 24 }
  },
  "child": {
    "id": "section-column-2",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [ ... ]
  }
}
```

**Section rules:**


| Condition                              | Mobile output                                                           |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `visible: false`                       | **Entire subtree omitted**                                              |
| `columns > 1` (or `columnsMobile > 1`) | Inner `gridView` instead of `column`                                    |
| `backgroundImage` set                  | Outer `stack` with cover `image` + optional overlay + inner `container` |
| `anchorId`                             | **Ignored** (no in-page anchor scroll on mobile)                        |
| `content[]` / `items[]`                | → `children[]` on inner column                                          |


---

### 6.20 Section with background image

When `backgroundImage` is present on a `Section`:

```json
{
  "id": "section-stack-1",
  "type": "stack",
  "props": { "fit": "loose" },
  "children": [
    { "id": "section-bg-image-2", "type": "image", "props": { "url": "...", "source": "network", "fit": "cover", "stackLayer": "fill" } },
    {
      "id": "section-overlay-3",
      "type": "container",
      "props": { "color": "rgba(0,0,0,0.4)" }
    },
    {
      "id": "section-inner-4",
      "type": "container",
      "props": { "padding": { "top": 60, "bottom": 60, "left": 24, "right": 24 } },
      "child": {
        "id": "section-column-5",
        "type": "column",
        "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
        "children": [ ... ]
      }
    }
  ]
}
```

> See [Section 6.12](#612-hero) for `stack` child positioning props (`stackLayer`, `stackAlign`, `stackInsetBottom`, `stackWidthFactor`).

---

### 6.18 Group / Flex

**Web input:**

```json
{
  "type": "Group",
  "props": {
    "direction": "row",
    "gap": 16,
    "alignItems": "center",
    "justifyContent": "space-between",
    "content": [ ... ]
  }
}
```

**Mobile output:**

```json
{
  "id": "row-1",
  "type": "row",
  "props": {
    "mainAxisAlignment": "spaceBetween",
    "crossAxisAlignment": "center",
    "gap": 16
  },
  "children": [ ... ]
}
```

- `direction: "column"` / `orientation: "vertical"` → `type: "column"`
- `direction: "row"` / `orientation: "horizontal"` → `type: "row"` (default)
- When `backgroundColor`, `padding`, `borderRadius`, or `boxShadow` are set, the flex node is **wrapped** in an outer `container` with those props.
- `wrap: "wrap"` is **not supported** — approximated as column-of-rows with a warning.
- Children are read from `content[]`, `items[]`, or `children[]`.

---

### 6.19 Grid (layout)

**Web input:**

```json
{ "type": "Grid", "props": { "numColumns": 3, "gap": 24, "items": [ ... ] } }
```

**Mobile output:**

```json
{
  "id": "grid-layout-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 3,
    "mainAxisSpacing": 24,
    "crossAxisSpacing": 24,
    "childAspectRatio": 1.0
  },
  "children": [ ... ]
}
```

---

### 6.25 Testimonials

#### Grid layout (default)

```json
{
  "id": "testimonials-grid-1",
  "type": "column",
  "props": { "crossAxisAlignment": "stretch", "mainAxisAlignment": "start", "gap": 16 },
  "children": [
    {
      "id": "tm-row-2",
      "type": "row",
      "props": { "mainAxisAlignment": "spaceBetween", "crossAxisAlignment": "stretch", "gap": 16 },
      "children": [
        {
          "id": "tm-row-cell-3",
          "type": "container",
          "props": { "expand": true, "expandAxis": "horizontal" },
          "child": {
            "id": "testimonial-4",
            "type": "card",
            "props": { "elevation": 1, "borderRadius": 12 },
            "child": {
              "id": "tm-body-5",
              "type": "column",
              "props": { "crossAxisAlignment": "start", "mainAxisAlignment": "start", "gap": 8 },
              "children": [
                { "id": "tm-rating-6", "type": "text", "props": { "value": "★★★★★", "fontSize": 16, "color": "#f59e0b" } },
                { "id": "tm-quote-7", "type": "text", "props": { "value": "منتج رائع!", "fontSize": 14 } },
                { "id": "tm-name-8", "type": "text", "props": { "value": "سارة", "fontSize": 14, "fontWeight": "bold" } }
              ]
            }
          }
        }
      ]
    }
  ]
}
```

#### Carousel layout (`layoutVariant: "carousel"`)

```json
{
  "id": "testimonials-carousel-1",
  "type": "listView",
  "props": { "scrollDirection": "horizontal" },
  "children": [
    {
      "id": "tm-carousel-cell-2",
      "type": "container",
      "props": { "width": 280 },
      "child": { ... }
    }
  ]
}
```

---

### 6.28 Blank

`Blank` blocks are **omitted** entirely (return `null`). No node is emitted.

---

### 6.34 ContentInput

Mobile block set. A form field → `textFormField`. The field key is `props.id`, taken from the web
`name` (falling back to `id`, then `"field"`).

**Web input:**

```json
{
  "type": "ContentInput",
  "props": {
    "label": "البريد الإلكتروني",
    "name": "email",
    "inputType": "email",
    "placeholder": "you@example.com",
    "required": true,
    "prependIcon": "none",
    "inputAction": ""
  }
}
```

**Mobile output:**

```json
{
  "id": "input-1",
  "type": "textFormField",
  "props": {
    "id": "email",
    "label": "البريد الإلكتروني",
    "hint": "you@example.com",
    "textDirection": "ltr",
    "keyboardType": "email",
    "validateEmail": true,
    "validateRequired": true
  }
}
```

**Field mapping:**


| Web field                | Mobile field        | Notes                                                              |
| ------------------------ | ------------------- | ------------------------------------------------------------------ |
| `name` (else `id`)       | `id`                | **Required.** Form payload key — never emitted as `name`           |
| `label`                  | `label`             | `""` = unlabelled search-bar layout                                |
| `placeholder`            | `hint`              | required rename                                                    |
| `required: true`         | `validateRequired`  | omitted when false                                                 |
| `inputType`              | `keyboardType`      | see table below; `text` emits no `keyboardType`                     |
| `prependIcon: "search"`  | `prefixIcon: "search"` | `"none"` emits nothing                                          |
| `debounceMs`             | —                   | **dropped** (debouncing is a web store concern)                    |
| `inputAction`            | —                   | **dropped** + warning when set to `search_products`                |
| `valueContext.path`      | —                   | not mapped on inputs; the field stays user-editable                |


**`inputType` → keyboard / validation / direction:**


| `inputType` | `keyboardType` | Extra props                      | `textDirection` |
| ----------- | -------------- | -------------------------------- | --------------- |
| `text`      | *(omitted)*    | —                                | from `direction` |
| `search`    | *(omitted)*    | —                                | from `direction` |
| `email`     | `email`        | `validateEmail: true`            | always `ltr`    |
| `tel`       | `phone`        | `validatePhone: true`            | always `ltr`    |
| `password`  | *(omitted)*    | `obscureText: true`              | always `ltr`    |
| `number`    | `number`       | —                                | from `direction` |


> **Bound store actions are not wired.** `inputAction` values (`search_products`,
> `filter_min_price`, `filter_max_price`, `profile_*`, `address_*`) describe a web `productsPage`
> store binding with no mobile equivalent. The field is emitted as a plain input and
> `search_products` additionally emits a warning — connect it to the search cubit by hand.

**Full `textFormField` prop reference:**


| Prop                        | Type                                          | Notes                                               |
| --------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `id`                        | string                                        | **Required.** Field identifier used in form payload |
| `label`                     | string                                        | Field label                                         |
| `hint`                      | string                                        | Placeholder text                                    |
| `textDirection`             | `"ltr"` | `"rtl"`                             | Always `"ltr"` for email/phone/password/OTP         |
| `keyboardType`              | `"email"` | `"phone"` | `"number"` | `"text"` |                                                     |
| `obscureText`               | boolean                                       | For passwords                                       |
| `maxLines` / `minLines`     | number                                        | Multi-line textarea                                 |
| `maxLength`                 | number                                        | Character cap                                       |
| `prefixIcon` / `suffixIcon` | string                                        | Material icon name                                  |
| `prefixText` / `suffixText` | string                                        | e.g. phone prefix `"+966"`                          |
| `clearable`                 | boolean                                       | Show clear button                                   |
| `shadow`                    | `"none"` | `"sm"` | `"md"` | `"lg"` | `"xl"`  |                                                     |
| `validateRequired`          | boolean                                       |                                                     |
| `validateEmail`             | boolean                                       |                                                     |
| `validatePhone`             | boolean                                       |                                                     |
| `validatePassword`          | boolean                                       |                                                     |
| `validatePattern`           | string                                        | Regex pattern                                       |
| `requiredMessage`           | string                                        | Custom required error text                          |
| `validationMessage`         | string                                        | Custom validation error text                        |
| `onSubmitted`               | action                                        | Action fired on keyboard submit                     |


#### Auth forms — the `form` wrapper

A `textFormField` on its own is not submittable: it needs an enclosing `form` node so the submit
button can gate on validity and read params out of `FormStateStore`.

The converter creates one automatically when a **`Section` holds both** at least one `ContentInput`
(or `ContentSwitch`) **and** a `ContentButton` whose `buttonAction` is an auth action (currently
`login`). The Section's content wrapper is then nested inside a `form`, and the button's `tap`
becomes a `cubitCall` on the `auth` cubit instead of the navigate stub:

```json
{
  "id": "form-75",
  "type": "form",
  "props": { "formId": "login-form", "id": "login-form" },
  "child": {
    "id": "section-column-74",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [
      { "id": "input-68", "type": "textFormField", "props": { "id": "phone", "label": "رقم الهاتف", "hint": "09xxxxxxxx", "textDirection": "ltr", "keyboardType": "phone", "validatePhone": true, "validateRequired": true } },
      { "id": "input-69", "type": "textFormField", "props": { "id": "password", "label": "كلمة المرور", "hint": "••••••••", "textDirection": "ltr", "obscureText": true, "validateRequired": true } },
      { "id": "switch-70", "type": "switchField", "props": { "id": "rememberMe", "label": "تذكّرني", "activeColor": "#0b78c5" } },
      {
        "id": "button-71",
        "type": "button",
        "props": { "label": "دخول", "variant": "elevated", "height": 56 },
        "tap": {
          "type": "cubitCall",
          "cubit": "auth",
          "method": "login",
          "requireValidForm": true,
          "formId": "login-form",
          "params": {
            "phone": { "source": "form", "field": "phone" },
            "password": { "source": "form", "field": "password" }
          },
          "onSuccess": { "type": "navigate", "route": "/home", "navigation_type": "go" }
        }
      }
    ]
  }
}
```

**Rules:**


| Rule | Detail |
| ---- | ------ |
| `formId` | `"<action>-form"` — `login` ⇒ `"login-form"`. Mirrored as `props.id`; the renderer reads `formId` first |
| Params | Every collected field id becomes `{ "source": "form", "field": "<id>" }` |
| Excluded params | `passwordConfirm`, `confirmPassword`, `rememberMe` — collected for validity, never sent |
| Scope | Field collection stops at nested `Section` boundaries; each Section owns one form |
| `submitRedirectUrl` | → `onSuccess: { navigate, navigation_type: "go" }` |
| No fields present | No `form` wrapper; the button falls back to `navigate → /auth/login` ([§ 6.5](#65-button--contentbutton)) |


> A bare `login` `ContentButton` with no sibling inputs stays a **navigate stub** to the engine's
> native `/auth/login` screen. That is the right output for a "sign in" entry point in a drawer or
> header — only a page that actually renders the fields becomes a form.

---

### 6.35 ContentSwitch

Mobile block set. An on/off toggle → `switchField`, which stores `"true"` / `"false"` **strings** in
`FormStateStore` (see [§ 6.32](#632-switchfield) for the full prop reference).

**Web input:**

```json
{
  "type": "ContentSwitch",
  "props": {
    "label": "أوافق على تلقّي العروض",
    "name": "marketing-opt-in",
    "helperText": "يمكنك إلغاء الاشتراك في أي وقت.",
    "defaultChecked": true,
    "labelPosition": "end",
    "switchAction": ""
  }
}
```

**Mobile output:**

```json
{
  "id": "switch-1",
  "type": "switchField",
  "props": {
    "id": "marketing-opt-in",
    "label": "أوافق على تلقّي العروض",
    "activeColor": "#0b78c5",
    "value": "true"
  }
}
```


| Web field                | Mobile field   | Notes                                                          |
| ------------------------ | -------------- | -------------------------------------------------------------- |
| `name` (else `id`)       | `id`           | FormStateStore key                                             |
| `label`                  | `label`        |                                                                |
| `defaultChecked: true`   | `value: "true"` | String, not boolean. Omitted entirely when false               |
| —                        | `activeColor`  | always `rootProps.primary` (fallback `#1D4ED8`)                |
| `helperText`             | —              | **dropped** + warning; no helper-text prop on `switchField`     |
| `labelPosition`          | —              | **dropped**; the engine places the label inline-start (RTL-aware) |
| `switchAction`           | —              | **dropped** + warning (see below)                              |
| `checkedValueContext`    | —              | not mapped; use `valuePath` manually if you need a bound state  |


> **Bound store actions are not wired.** `filter_in_stock_only`, `marketing_email_opt_in`,
> `marketing_sms_opt_in`, `address_is_default` describe a web store binding. The toggle is emitted as
> a plain `switchField` and a warning is raised. A `filter_in_stock_only` switch in particular does
> **not** filter a `gridView` on mobile — wire it to the products cubit by hand.

A `source: "form"` `cubitCall` param reads the `"true"` / `"false"` string back out.

---

### 6.36 ButtonGroup

Mobile block set. A segmented control. Only `bindingMode: "static"` converts.

#### `bindingMode: "static"` → `row` of `button`

**Web input:**

```json
{
  "type": "ButtonGroup",
  "props": {
    "bindingMode": "static",
    "defaultSelectedValue": "option-a",
    "gap": "theme-8",
    "align": "center",
    "inactiveStyle": { "bgColor": "theme-surface", "textColor": "theme-text", "radius": "theme-md", "buttonSize": "theme-sm" },
    "activeStyle": { "bgColor": "theme-primary", "textColor": "theme-surface", "radius": "theme-md", "buttonSize": "theme-sm" },
    "items": [
      { "title": "الخيار أ", "value": "option-a", "destinationType": "link", "link": { "kind": "page", "pageId": "/" } },
      { "title": "الخيار ب", "value": "option-b", "destinationType": "link", "link": { "kind": "page", "pageId": "/products" } }
    ]
  }
}
```

**Mobile output:**

```json
{
  "id": "button-group-3",
  "type": "row",
  "props": { "mainAxisAlignment": "center", "crossAxisAlignment": "center", "gap": 8 },
  "children": [
    {
      "id": "btn-group-item-1",
      "type": "button",
      "props": { "label": "الخيار أ", "variant": "filled", "color": "#0b78c5", "height": 36 },
      "tap": { "type": "navigate", "route": "/home", "navigation_type": "push" }
    },
    {
      "id": "btn-group-item-2",
      "type": "button",
      "props": { "label": "الخيار ب", "variant": "outlined", "color": "#f6f8fc", "height": 36 },
      "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
    }
  ]
}
```


| Web                              | Mobile                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| `align`                          | `mainAxisAlignment` (`left`→`start`, `center`, `right`→`end`) |
| `gap`                            | `gap` (token resolved)                                       |
| item matching `defaultSelectedValue` | `variant: "filled"`, `color` from `activeStyle.bgColor`   |
| every other item                 | `variant: "outlined"`, `color` from `inactiveStyle.bgColor`   |
| `*Style.buttonSize`              | `height` ([§ 5](#button-size--height) size map)              |
| item `destinationType` / `link` / `buttonAction` / `zoneKey` | node-level `tap`, same rules as [§ 6.5](#65-button--contentbutton) |
| `*Style.textColor` / `radius`    | **dropped** — engine `button` accepts only `color`            |
| `value`, `defaultSelectedValue`  | **not emitted** — see below                                   |


> **Selection state is not tracked on mobile.** Every conversion warns. `variant: "filled"` on the
> default item is purely cosmetic: tapping a button runs its own destination and nothing restyles.
> If the merchant needs live segmented state, use `tabs` or a `radioGroup`
> ([§ 6.30](#630-radiogroup)) authored by hand.

#### `bindingMode: "categories"` / `"pagination"` → `unsupported`

Items are generated at runtime from the web `productsPage` store, so there is nothing static to
convert:

```json
{ "id": "unsupported-1", "type": "unsupported", "props": { "blockType": "ButtonGroup" } }
```

Warning: `ButtonGroup bindingMode "categories" builds its items from runtime store data; no static mobile equivalent. Wire category filters / pagination manually.`

An empty `items[]` array in `static` mode emits `null` (the block is skipped).

---

### 6.37 Chip

Mobile block set on the web side, but **not convertible** — `Chip` renders a runtime array read
through `listValueContext` (product tags, category names) and the engine has no chip-list primitive.

**Mobile output:** `null` — the block is skipped and a warning is emitted.

```
Chip renders a runtime array from "product.tags"; the engine has no chip-list primitive and the
path is not in the valueContext map — block skipped
```

`listValueContext.path` values are outside the [§ 9.5](#95-valuecontext-binding-group--content-blocks)
binding table (which maps scalars, not arrays), so there is no path to forward either.

**Workaround:** if the tags matter, author a `row` of `container` + `text` nodes by hand, or fold the
values into a single bound `text` node.

---

### 6.38 ZoneDrawer / ZoneBottomSheet

Mobile block set, but **site zones** — they never appear in `body[]`. They are authored through the
**المناطق** sidebar plugin, arrive under the `zones` key of the payload ([§ 1e](#1e--web-sitedata--puck-userdata-the-real-merchant-payload)),
and are applied to every page.


| Zone                | Becomes                                                                 | Detail                                        |
| ------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| `ZoneDrawer`        | Page-level `appDrawer` built from `slot[]`                               | [§ appDrawer structure](#appdrawer-structure) |
| `ZoneBottomSheet`   | Inlined into `tap.openBottomSheet.child` on whichever `ContentButton` / `ButtonGroup` item targets its `zoneKey` | [§ 6.5](#65-button--contentbutton) |


**Activation flags are honoured.** `is_active: false` drops the zone; overlays additionally warn.
`is_mobile_only` is not read by the converter — mobile output is mobile by definition.

**A drawer also flips the appBar's burger button on:** when a `ZoneDrawer` is present, the page
`appBar` gets `showMenu: true` + `menuAction: { "type": "openDrawer" }` even with no `SiteHeader`.

**Only one `appDrawer` per page.** A second drawer zone is dropped with a warning.

**An overlay nobody opens is dropped.** A `ZoneBottomSheet` reaches mobile *only* through the tap
that opens it. If no block on the page targets its `zoneKey`, its content is discarded and the
converter warns:

```
Overlay zone "cart-sheet" is never opened on route "/home"; nothing triggers it, so its content
was dropped. Add a ContentButton with destinationType "zone" and zoneKey "cart-sheet".
```

A `ZoneBottomSheet` that lands in `body[]` directly (no zone wiring at all) emits `unsupported`.

> **Bottom sheet constraint** (repeated from [G2](#g2--tap-is-node-level-never-inside-props)): sheet
> content renders from a **snapshot** of dataContext at open time, and a trigger inside an open sheet
> that opens another sheet must set `"replaceCurrent": true`.

---

### 6.29 Timer

Emit `timer` **only** when the page input explicitly defines a redirect or delay. Do not invent a redirect target.

```json
{
  "id": "splash-timer-1",
  "type": "timer",
  "props": {
    "durationMs": 3000,
    "tap": { "type": "navigate", "route": "<page-defined-target>", "navigation_type": "replace" }
  }
}
```

---

### 6.30 RadioGroup

Single-choice vertical radio list — used for payment/shipping/option pickers. Web radio-style blocks map here, not a column of buttons.

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
    "type": "cubitCall",
    "cubit": "checkout",
    "method": "selectPaymentMethod",
    "params": { "providerCode": { "source": "tap", "field": "value" } },
    "onSuccess": { "type": "closeBottomSheet" }
  }
}
```


| Item field        | Notes                                          |
| ----------------- | ---------------------------------------------- |
| `badge`           | Small tag on the row (e.g. "المنزل" / "العمل") |
| `removable: true` | Shows ✕ on the row                             |



| Group prop     | Notes                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onItemRemove` | Action when ✕ is tapped; `dataContext.tap` carries `{ value, index, label }` — e.g. `cubitCall checkout.deleteAddress { addressId: { source: "tap", field: "value" } }` |

### 6.31 Conditional visibility (`visibleWhen`)

Any node may carry `props.visibleWhen`:

```json
{
  "type": "container",
  "props": {
    "visibleWhen": { "source": "data", "field": "checkout.selectedPaymentMethod", "when": "equals", "value": "cod" }
  }
}
```


| Field    | Values                                                  |
| -------- | ------------------------------------------------------- |
| `source` | `form` (default) | `pageState` | `data` / `dataContext` |
| `field`  | form field id / pageState key / dataContext path        |
| `when`   | `nonEmpty` (default) | `isEmpty` | `equals`             |
| `value`  | Comparison value for `equals`                           |


> For cubitCall param sources, see [G2b](#g2b--cubitcall-param-source-vocabulary) — `visibleWhen` accepts `source: "data"` but cubitCall params do not.

### 6.32 SwitchField

Labeled on/off toggle bound to `FormStateStore` — stores `"true"` / `"false"` strings. Web boolean toggles / checkbox-style single-boolean inputs map here.

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


| Prop                                              | Notes                                          |
| ------------------------------------------------- | ---------------------------------------------- |
| `id` / `controllerId`                             | FormStateStore key; value `"true"` / `"false"` |
| `label`                                           | Inline-start text (RTL-aware)                  |
| `value` / `valuePath`                             | Initial state (form store wins)                |
| `activeColor`, `labelColor`, `fontSize`, `margin` | Styling                                        |
| `enabled`                                         | Default `true`                                 |
| `onChanged`                                       | Action dispatched with the new value           |


A `source: "form"` cubitCall param reads the `"true"` / `"false"` string (e.g. `isDefault` on `checkout.saveAddress`).

## 6B — Legacy web blocks (not in the mobile block set)

These block types are **absent from [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md)**. Most are also
legacy on the web side (hidden from the editor palette but still resolvable so old
`store_config.json` payloads render); the rest are web-only conveniences.

**The converter still handles all of them** — an old merchant payload must not break. But they are
frozen: no new features, and **no new example may use them**.

| Legacy block | Subsection | Use instead |
| --- | --- | --- |
| RichText / ContentHtml | [§ 6.3](#63-richtext--contenthtml) | `ContentParagraph` — plain text only; there is no rich-text block in the mobile set. |
| Space | [§ 6.4](#64-space) | `Section` padding, or `Group.gap` / `Flex.gap` for space between siblings. |
| Video (MP4 / HLS) | [§ 6.10](#610-video-mp4--hls) | `VideoEmbed` ([§ 6.11b](#611b-videoembed-mp4--hls)) — it accepts MP4/HLS URLs too. |
| Hero | [§ 6.12](#612-hero) | `Section` (background image + padding) wrapping `ContentHeading` / `ContentParagraph` / `ContentButton`. |
| Card | [§ 6.13](#613-card) | `Group` with `backgroundColor` + `padding` + `borderRadius` + `boxShadow`. |
| Badge | [§ 6.14](#614-badge) | `Group` with `backgroundColor` + `borderRadius` wrapping a `ContentParagraph`. |
| Stats | [§ 6.21](#621-stats) | `Flex` / `Group` of `ContentHeading` + `ContentParagraph` pairs. |
| Logos | [§ 6.22](#622-logos) | `ImageGallery` in `grid` mode. |
| ContactForm | [§ 6.23](#623-contactform) | `ContentInput` fields inside a `Section` ([§ 6.34](#634-contentinput)) — that path also builds the `form` wrapper. |
| NavMenu | [§ 6.24](#624-navmenu) | `ZoneDrawer` `slot[]` of `ContentLink` blocks ([§ 6.38](#638-zonedrawer--zonebottomsheet)). |
| Sidebar | [§ 6.26](#626-sidebar) | `Group` with `direction: "column"`. |
| Template | [§ 6.27](#627-template) | Nothing — the wrapper has no purpose in the mobile set; author the children directly. |
| Checkout address flow | [§ 6.33](#633-checkout-address-flow) | No mobile-set equivalent. Checkout is a native multi-route flow; the JSON reaches it through `ContentButton` `buttonAction: "makeOrder"` ([§ 6.5](#65-button--contentbutton)). |

> `SiteHeader` / `SiteFooter` / `SiteDrawerShell` / `SideDrawer` / `ZonePopup` are also outside the
> block set but are **site zones**, not body blocks — their ingest rules stay live in
> [§ 7](#7-page-envelope-structure) and [§ 10](#10-unsupported-blocks).

---

### 6.3 RichText / ContentHtml

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `ContentParagraph` — plain text only; there is no rich-text block in the mobile set.

**Web input:**

```json
{ "type": "RichText", "props": { "richtext": "<h2>عن المتجر</h2><p>نحن متجر متخصص...</p>" } }
```

**Mobile output:**

```json
{
  "id": "richtext-1",
  "type": "richtext",
  "props": { "value": "<h2>عن المتجر</h2><p>نحن متجر متخصص...</p>" }
}
```

The HTML is passed through as-is. The mobile renderer strips tags for display.

---

### 6.4 Space

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `Section` padding, or `Group.gap` / `Flex.gap` for space between siblings.

**Web input:**

```json
{ "type": "Space", "props": { "size": "theme-40", "direction": "vertical" } }
```

**Mobile output:**

```json
{ "id": "spacer-1", "type": "sizedBox", "props": { "height": 40 } }
```

- `direction: "horizontal"` → emits `"width"` instead of `"height"`.
- Default direction is `vertical`.

---

### 6.10 Video (MP4 / HLS)

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `VideoEmbed` ([§ 6.11b](#611b-videoembed-mp4--hls)) — it accepts MP4/HLS URLs too.

`Video` blocks (direct MP4/HLS src) are transformed to `videoPlayer`.

**Web input:**

```json
{
  "type": "Video",
  "props": {
    "src": "https://example.com/promo.mp4",
    "controls": "on",
    "autoPlay": "off",
    "aspectRatio": "16:9"
  }
}
```

**Mobile output:**

```json
{
  "id": "video-wrapper-1",
  "type": "container",
  "props": { "aspectRatio": 1.777 },
  "child": {
    "id": "video-2",
    "type": "videoPlayer",
    "props": {
      "url": "https://example.com/promo.mp4",
      "showControls": true,
      "autoplay": false
    }
  }
}
```

When no `aspectRatio` is set, the `container` wrapper is omitted and `videoPlayer` is emitted directly.

> `loop` and `muted` are **not** read by the engine — do not emit them.

---

### 6.12 Hero

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `Section` (background image + padding) wrapping `ContentHeading` / `ContentParagraph` / `ContentButton`.

#### Background image mode → `stack`

**Web input:**

```json
{
  "type": "Hero",
  "props": {
    "title": "ابدأ التسوق",
    "description": "أفضل المنتجات بأفضل الأسعار",
    "align": "center",
    "padding": "40px",
    "image": { "url": "https://example.com/hero.jpg", "mode": "background" },
    "buttons": [
      { "label": "تسوق الآن", "variant": "primary", "href": "/products" }
    ]
  }
}
```

**Mobile output:**

```json
{
  "id": "hero-stack-1",
  "type": "stack",
  "props": { "fit": "loose" },
  "children": [
    {
      "id": "hero-bg-2",
      "type": "image",
      "props": { "url": "https://example.com/hero.jpg", "source": "network", "fit": "cover", "stackLayer": "fill" }
    },
    {
      "id": "hero-col-3",
      "type": "column",
      "props": { "mainAxisAlignment": "center", "crossAxisAlignment": "center", "gap": 16, "padding": 40 },
      "children": [
        { "id": "hero-title-4", "type": "text", "props": { "value": "ابدأ التسوق", "fontSize": 28, "fontWeight": "bold", "textAlign": "center" } },
        { "id": "hero-desc-5", "type": "text", "props": { "value": "أفضل المنتجات بأفضل الأسعار", "fontSize": 16, "textAlign": "center" } },
        {
          "id": "hero-buttons-6",
          "type": "row",
          "props": { "mainAxisAlignment": "center", "crossAxisAlignment": "center", "gap": 12 },
          "children": [
            {
              "id": "hero-btn-7",
              "type": "button",
              "props": { "label": "تسوق الآن", "variant": "elevated", "height": 48 },
              "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
            }
          ]
        }
      ]
    }
  ]
}
```

`**stack` child positioning** — per-child props on each child node's `props` (not on the `stack` itself):


| Prop               | Notes                                                            |
| ------------------ | ---------------------------------------------------------------- |
| `stackLayer`       | `"fill"` (index 0 default) | `"positioned"` (default for others) |
| `stackAlign`       | alignment when positioned (default `"bottomCenter"`)             |
| `stackInsetBottom` | fixed px from bottom — preferred for footers/docks               |
| `stackWidthFactor` | width as fraction of stack (`1` = full width)                    |


Without these, every non-background child lands at the default bottom-center position. Background images should use `stackLayer: "fill"`.

#### No background image → `container` + `column`

When no background image is present, Hero emits:

```json
{
  "id": "hero-container-1",
  "type": "container",
  "props": { "padding": { "top": 80, "bottom": 80, "left": 24, "right": 24 } },
  "child": {
    "id": "hero-col-2",
    "type": "column",
    "props": { "crossAxisAlignment": "center", "mainAxisAlignment": "center", "gap": 16 },
    "children": [ ... ]
  }
}
```

---

### 6.13 Card

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `Group` with `backgroundColor` + `padding` + `borderRadius` + `boxShadow`.

**Web input:**

```json
{
  "type": "Card",
  "props": {
    "title": "شحن سريع",
    "description": "توصيل خلال يومي عمل",
    "icon": "truck",
    "mode": "card"
  }
}
```

**Mobile output:**

```json
{
  "id": "card-1",
  "type": "card",
  "props": { "elevation": 2, "borderRadius": 8 },
  "child": {
    "id": "card-body-2",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "start", "gap": 8, "padding": 16 },
    "children": [
      { "id": "card-icon-3", "type": "icon", "props": { "name": "local_shipping", "size": 32, "color": "#0b78c5" } },
      { "id": "card-title-4", "type": "text", "props": { "value": "شحن سريع", "fontSize": 16, "fontWeight": "bold" } },
      { "id": "card-desc-5", "type": "text", "props": { "value": "توصيل خلال يومي عمل", "fontSize": 14, "color": "#64748b" } }
    ]
  }
}
```

`**mode` → `elevation` map:**


| Web `mode` / `variant` | Mobile `elevation` |
| ---------------------- | ------------------ |
| `card`                 | `2`                |
| `flat`                 | `0`                |
| `outlined`             | `0`                |
| `elevated`             | `4`                |
| `default`              | `1`                |


---

### 6.14 Badge

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `Group` with `backgroundColor` + `borderRadius` wrapping a `ContentParagraph`.

**Web input:**

```json
{ "type": "Badge", "props": { "label": "-20%", "variant": "discount", "size": "md" } }
```

**Mobile output:**

```json
{
  "id": "badge-1",
  "type": "container",
  "props": { "padding": { "left": 8, "right": 8, "top": 4, "bottom": 4 }, "color": "#FEE2E2", "borderRadius": 9999 },
  "child": {
    "id": "badge-label-2",
    "type": "text",
    "props": { "value": "-20%", "fontSize": 14, "fontWeight": "bold", "color": "#DC2626" }
  }
}
```

**Badge variants and colors:**


| Variant            | Background | Foreground |
| ------------------ | ---------- | ---------- |
| `discount`         | `#FEE2E2`  | `#DC2626`  |
| `inStock`          | `#DCFCE7`  | `#16A34A`  |
| `outOfStock`       | `#F3F4F6`  | `#6B7280`  |
| `custom` / *other* | `#EBF5FF`  | `#2563EB`  |


**Font size by `size`:** `sm` → 12, `md` → 14, `lg` → 16.

---

### 6.21 Stats

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `Flex` / `Group` of `ContentHeading` + `ContentParagraph` pairs.

**Web input:**

```json
{
  "type": "Stats",
  "props": {
    "items": [
      { "title": "١٠٠٠+", "description": "عميل سعيد" },
      { "title": "٥٠+", "description": "منتج" }
    ]
  }
}
```

**Mobile output:**

```json
{
  "id": "stats-row-1",
  "type": "row",
  "props": { "mainAxisAlignment": "spaceAround", "crossAxisAlignment": "center" },
  "children": [
    {
      "id": "stat-col-2",
      "type": "column",
      "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "center", "gap": 4 },
      "children": [
        { "id": "stat-value-3", "type": "text", "props": { "value": "١٠٠٠+", "fontSize": 22, "fontWeight": "bold" } },
        { "id": "stat-label-4", "type": "text", "props": { "value": "عميل سعيد", "fontSize": 14 } }
      ]
    }
  ]
}
```

---

### 6.22 Logos

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `ImageGallery` in `grid` mode.

**Mobile output:**

```json
{
  "id": "logos-list-1",
  "type": "listView",
  "props": { "scrollDirection": "horizontal", "height": 60 },
  "children": [
    { "id": "logo-2", "type": "image", "props": { "url": "...", "source": "network", "height": 48, "fit": "contain" } }
  ]
}
```

---

### 6.23 ContactForm

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `ContentInput` fields inside a `Section` ([§ 6.34](#634-contentinput)) — that path also builds the `form` wrapper.

**Mobile output:**

```json
{
  "id": "contact-form-1",
  "type": "form",
  "props": { "formId": "contact-form", "id": "contact-form" },
  "child": {
    "id": "contact-col-2",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [
      {
        "id": "contact-field-3",
        "type": "textFormField",
        "props": { "id": "name", "label": "الاسم", "hint": "", "validateRequired": true, "textDirection": "rtl" }
      },
      {
        "id": "contact-field-4",
        "type": "textFormField",
        "props": { "id": "email", "label": "البريد الإلكتروني", "hint": "", "keyboardType": "email", "validateEmail": true, "textDirection": "ltr" }
      },
      {
        "id": "contact-field-5",
        "type": "textFormField",
        "props": { "id": "message", "label": "الرسالة", "hint": "", "maxLines": 5, "minLines": 3, "textDirection": "rtl" }
      },
      {
        "id": "contact-submit-6",
        "type": "button",
        "props": { "label": "إرسال", "height": 48, "variant": "elevated", "fullWidth": true },
        "tap": { "type": "apiCall", "method": "POST", "url": "/api/v1/public/contact", "requireValidForm": true, "formId": "contact-form" }
      }
    ]
  }
}
```

- `**textFormField` field key is `props.id**` — the renderer registers the field value in `FormStateStore` under this key. Never use `name`.
- Email field always gets `textDirection: "ltr"`.
- `submitUrl` prop overrides the default `/api/v1/public/contact`.

**Full `textFormField` prop reference:**


| Prop                        | Type                                          | Notes                                               |
| --------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `id`                        | string                                        | **Required.** Field identifier used in form payload |
| `label`                     | string                                        | Field label                                         |
| `hint`                      | string                                        | Placeholder text                                    |
| `textDirection`             | `"ltr"` | `"rtl"`                             | Always `"ltr"` for email/phone/OTP                  |
| `keyboardType`              | `"email"` | `"phone"` | `"number"` | `"text"` |                                                     |
| `obscureText`               | boolean                                       | For passwords                                       |
| `maxLines` / `minLines`     | number                                        | Multi-line textarea                                 |
| `maxLength`                 | number                                        | Character cap                                       |
| `prefixIcon` / `suffixIcon` | string                                        | Material icon name                                  |
| `prefixText` / `suffixText` | string                                        | e.g. phone prefix `"+966"`                          |
| `clearable`                 | boolean                                       | Show clear button                                   |
| `shadow`                    | `"none"` | `"sm"` | `"md"` | `"lg"` | `"xl"`  |                                                     |
| `validateRequired`          | boolean                                       |                                                     |
| `validateEmail`             | boolean                                       |                                                     |
| `validatePhone`             | boolean                                       |                                                     |
| `validatePassword`          | boolean                                       |                                                     |
| `validatePattern`           | string                                        | Regex pattern                                       |
| `requiredMessage`           | string                                        | Custom required error text                          |
| `validationMessage`         | string                                        | Custom validation error text                        |
| `onSubmitted`               | action                                        | Action fired on keyboard submit                     |


---

### 6.24 NavMenu

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `ZoneDrawer` `slot[]` of `ContentLink` blocks ([§ 6.38](#638-zonedrawer--zonebottomsheet)).

**Mobile output:**

```json
{
  "id": "nav-menu-1",
  "type": "column",
  "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 0 },
  "children": [
    {
      "id": "nav-link-2",
      "type": "button",
      "props": { "label": "الرئيسية", "variant": "text", "fullWidth": true },
      "tap": { "type": "navigate", "route": "/home", "navigation_type": "push" }
    }
  ]
}
```

---

### 6.26 Sidebar

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** `Group` with `direction: "column"`.

Sidebar is emitted as an inline `column` (the `dock` prop is ignored with a warning).

```json
{
  "id": "sidebar-1",
  "type": "column",
  "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
  "children": [ ... ]
}
```

---

### 6.27 Template

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** Nothing — the wrapper has no purpose in the mobile set; author the children directly.

`Template` is flattened: children are emitted directly. The wrapper node is discarded. When there is exactly one child, that child is returned unwrapped.

---

### 6.33 Checkout address flow

> **LEGACY — not in the mobile block set.** This block type is absent from
> [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md); the mobile Site JSON registry will not produce it.
> The mapping below is kept because merchant payloads predating the mobile registry still contain it.
> **Do not author new examples with it** — use the replacement noted under each heading.
> **Use instead:** No mobile-set equivalent. Checkout is a native multi-route flow; the JSON reaches it through `ContentButton` `buttonAction: "makeOrder"` ([§ 6.5](#65-button--contentbutton)).

New checkout `cubitCall` methods the converter may target:


| `method`                | Purpose                                                                            | Key params                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pickAddressLocation`   | Closes any sheet, pushes native map picker; `onSuccess` only on confirmed location | —                                                                                                   |
| `saveAddress`           | Save address + recalc shipping                                                     | `label` (HOME/WORK/OTHER), `recipientName`, `recipientPhone`, `streetAddress`, `notes`, `isDefault` |
| `selectSavedAddress`    | Set delivery address + recalc                                                      | `addressId` (or radio `tap.value`)                                                                  |
| `deleteAddress`         | Remove saved address                                                               | `addressId`                                                                                         |
| `setDefaultAddress`     | Server-side default flag                                                           | `addressId`                                                                                         |
| `placeOrder` (extended) | Now accepts optional `guestEmail`                                                  | `guestEmail` from guest contact form                                                                |


**dataContext keys for bindings:** `checkout.addressOptions` (radioGroup-ready items with `badge` / `removable`), `checkout.selectedAddressId`, `checkout.hasPendingLocation`, `checkout.pendingLocation.areaLine` / `.streetLine`, `session.isLoggedIn` (for `visibleWhen` — guest-only cards use `when: "equals", value: "false"`).

**Locked contract:** guest email is a **checkout-payload field, not an address field** — never emit email inputs inside address forms; guest email lives in a guest-only contact card on `/checkout` → `placeOrder.params.guestEmail`.

**No map component type** — the map screen is native; JSON reaches it only via `cubitCall checkout.pickAddressLocation`. Web map/location blocks with no such trigger → `unsupported` + warning.

---

## 7. Page Envelope Structure

When the input is a page object or array of page objects, the converter emits a full app config:

```json
{
  "schemaVersion": "1.0",
  "app": {
    "name": "SOOQ Merchant Mobile",
    "bundleId": "com.sooq.merchant.mobile",
    "apiBaseUrl": "https://sooq.up.railway.app",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "tenantSlug": "example-merchant"
  },
  "theme": {
    "mode": "light",
    "colors": {
      "primary": "#0b78c5",
      "surface": "#f6f8fc",
      "background": "#F1F5F9",
      "text": "#14243f",
      "muted": "#6b7d93",
      "success": "#16A34A",
      "warning": "#D97706",
      "error": "#DC2626"
    },
    "typography": {
      "fontFamily": "Tajawal",
      "scale": { "xs": 12, "sm": 14, "md": 16, "lg": 18, "xl": 22, "xxl": 28, "display": 36 },
      "weights": { "normal": 400, "medium": 500, "bold": 700 },
      "lineHeight": { "tight": 1.25, "normal": 1.5, "relaxed": 1.75 }
    },
    "radius": { "none": 0, "sm": 8, "md": 12, "lg": 18, "xl": 24, "full": 9999 },
    "spacing": { "xs": 4, "sm": 10, "md": 16, "lg": 24, "xl": 36 },
    "buttons": {
      "sm": { "height": 36, "padX": 14, "fontSize": 14, "radius": 10 },
      "md": { "height": 48, "padX": 18, "fontSize": 16, "radius": 12 },
      "lg": { "height": 56, "padX": 26, "fontSize": 16, "radius": 14 }
    }
  },
  "navigation": {
    "type": "tabs",
    "initialRoute": "/splash",
    "shellExcludeRoutes": [
      "/splash", "/splash-carousel", "/auth/login", "/auth/otp-reset",
      "/product/details", "/checkout", "/checkout/address",
      "/checkout/payment", "/checkout/success", "/orders"
    ],
    "tabs": [
      { "id": "tab-home", "label": "الرئيسية", "icon": "home", "route": "/home" },
      { "id": "tab-categories", "label": "الأقسام", "icon": "grid_view", "route": "/categories" },
      { "id": "tab-search", "label": "بحث", "icon": "search", "route": "/search" },
      { "id": "tab-cart", "label": "السلة", "icon": "shopping_cart", "route": "/cart" },
      { "id": "tab-profile", "label": "حسابي", "icon": "person", "route": "/profile" }
    ]
  },
  "pages": [
    {
      "id": "page-home",
      "route": "/home",
      "title": "Home",
      "background": "#ffffff",
      "scroll": "vertical",
      "appBar": { ... },
      "body": [ ... ],
      "footer": { ... },
      "appDrawer": { ... }
    }
  ]
}
```

The five tabs above are what a site with all five of those pages gets. `navigation.tabs` is derived
from `pages[]`, so a smaller site gets a smaller bar — see [§ 7.3](#73-tabs-are-derived-from-the-pages).

### Page rules


| Rule                 | Value                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route `/`            | Normalized to `/home`                                                                                                                                                                                                                                              |
| Default scroll       | `"vertical"`                                                                                                                                                                                                                                                       |
| Auth / splash pages  | `"layout": "centered"` and **no `scroll` key** — emitted automatically when the page holds an auth form. See [§ 7.1](#71-auth-and-splash-pages-use-layout-centered-not-scroll-none). **Never** hand-author `"scroll": "none"` for a static form                     |
| `background` default | `"#ffffff"`                                                                                                                                                                                                                                                        |
| Page chrome          | Use page-level `background` + `scroll` — **never** emit a `scaffold` node in `body[]`                                                                                                                                                                              |
| Pinned CTA bars      | `pages[].footer` — **never** end of `body[]` and never `stack` + `stackLayer: "positioned"` for page footers                                                                                                                                                       |
| `navigation.tabs`    | **Derived from `pages[]`** — one tab per page route that exists, `/home` first, capped at 5. Never a fixed list: a tab whose route has no page is a dead tab. See [§ 7.3](#73-tabs-are-derived-from-the-pages)                                                     |
| `shellExcludeRoutes` | **Generated** from system routes + every `pages[].route` that is not a tab root — never copy a static list verbatim per merchant. A route missing from `shellExcludeRoutes` crashes with a duplicate-page-key assert when pushed from another shell-excluded page. |


### 7.1 Auth and splash pages use `layout: "centered"`, not `scroll: "none"`

The two look interchangeable and are not. Only `layout: "centered"` produces a working full-viewport
form page.

| | `"scroll": "none"` | `"layout": "centered"` |
| --- | --- | --- |
| Outer page scroll | Off | Off (engine forces `pageScroll: none`) |
| Root column | Left as authored | `mainAxisSize: max` + `crossAxisAlignment: stretch` |
| Expand container | **Not injected** | Injected if `body` has none |
| Layout validators | `static_page_overflow_risk` fires | Exempt |
| Body taller than screen | **Overflows** — nothing scrolls, submit button clipped | Fits; content centres in the viewport |

`scroll: "none"` only removes the scroll. It does not give the page a bounded height to lay out
against, so a static form shrink-wraps under the app bar and anything past the fold is unreachable —
there is no scroll left to reach it with. Reserve `none` for a body whose own child scrolls
(`gridView` / `listView` with `enableInnerScroll: true`); see
[`docs/engine/builder-specs/08-page-scroll.md`](docs/engine/builder-specs/08-page-scroll.md).

**The converter emits this automatically.** A page holding an auth form (a `Section` with
`ContentInput` fields plus a `login` `ContentButton`) gets `layout: "centered"`, the `scroll` key is
dropped even if the page input set one, and `body[]` is wrapped in the shell the preset expects:

```json
{
  "id": "page-login",
  "route": "/login",
  "background": "#ffffff",
  "layout": "centered",
  "appBar": { "…": "…" },
  "body": [
    {
      "id": "page-expand-84",
      "type": "container",
      "props": { "expand": true, "color": "#ffffff" },
      "child": {
        "id": "page-center-85",
        "type": "column",
        "props": { "mainAxisAlignment": "center", "crossAxisAlignment": "stretch", "mainAxisSize": "max" },
        "children": [ { "…": "the Section containers" } ]
      }
    }
  ]
}
```

The `expand` container is what gives the column a bounded height; `mainAxisSize: max` +
`mainAxisAlignment: center` is what centres the form under the app bar. Reference:
[`docs/engine/builder-specs/15-page-layout-preset.md`](docs/engine/builder-specs/15-page-layout-preset.md)
and the `/auth/login` page in `mobile_production_v2.json`.

### 7.2 `auth.login` binds `phone` — never `email`

The engine's auth is a **customer phone/OTP flow**: `/api/v1/customer/auth/otp/request` and
`/verify`, request bodies `CustomerOtpRequest` / `CustomerOtpVerifyRequest`, both keyed on phone
([`docs/06-feature-auth.md`](docs/06-feature-auth.md)). `AuthCubit.login` has no binding for any
other credential.

So a login form built on an email or username field produces a `cubitCall` the cubit cannot read:
the form validates, the call fires, and the user is never signed in. Nothing errors — it just
silently does nothing, which is why this is worth catching at authoring time.

| | Web input | Mobile output |
| --- | --- | --- |
| ✅ | `ContentInput` `name: "phone"`, `inputType: "tel"` | `textFormField` `id: "phone"` + `keyboardType: "phone"` + `validatePhone`; param `phone` |
| ❌ | `ContentInput` `name: "email"`, `inputType: "email"` | param `email` — **dead**; converter warns |

The converter warns rather than renaming the field: silently rewriting `email` → `phone` would leave
an "email" label and `validateEmail` on a field the cubit reads as a phone number, which fails later
and less visibly. Fix the web input.

```
Auth "login" form has no "phone" field (found "email"); the engine's auth cubit is a
phone/OTP flow and cannot bind any other credential — use a ContentInput with name
"phone" and inputType "tel"
```

`password` and `otpCode` are the only other fields the login form should carry.
`passwordConfirm` / `confirmPassword` / `rememberMe` are collected for validity and excluded from
`params` ([§ 6.34](#auth-forms--the-form-wrapper)).

### 7.3 Tabs are derived from the pages

`navigation.tabs` used to be a fixed five-route list — `/home`, `/categories`, `/search`, `/cart`,
`/profile` — emitted for every conversion. Any merchant without all five pages shipped tabs that
navigate to a route with no page behind them. Both worked examples did.

**The rule now:** one tab per page route, `/home` first, everything else in page order.

| Step | Behaviour |
| --- | --- |
| Candidates | Every `pages[].route`, minus engine-owned routes (`/splash`, `/checkout*`, `/orders`, `/auth/*`, `/product/details`) and minus dynamic routes (`:param`) |
| Order | `/home` first, then page order |
| Cap | First 5. Overflow is shell-excluded and warned about |
| Label / icon | Canonical chrome if the route is known (table below); otherwise the page's own `title` and `icon: "article"` |
| `shellExcludeRoutes` | Engine routes + every page route that did **not** become a tab |

Canonical chrome:

| Route | `id` | `label` | `icon` |
| --- | --- | --- | --- |
| `/home` | `tab-home` | الرئيسية | `home` |
| `/categories` | `tab-categories` | الأقسام | `grid_view` |
| `/search` | `tab-search` | بحث | `search` |
| `/cart` | `tab-cart` | السلة | `shopping_cart` |
| `/profile` | `tab-profile` | حسابي | `person` |
| `/products` | `tab-products` | المنتجات | `grid_view` |
| `/wishlist` | `tab-wishlist` | المفضلة | `favorite` |
| `/login` | `tab-login` | تسجيل الدخول | `person` |

A two-page site gets a two-tab bar:

```json
"navigation": {
  "type": "tabs",
  "initialRoute": "/splash",
  "shellExcludeRoutes": ["/splash", "/splash-carousel", "/auth/login", "…", "/orders"],
  "tabs": [
    { "id": "tab-home", "label": "الرئيسية", "icon": "home", "route": "/home" },
    { "id": "tab-login", "label": "تسجيل الدخول", "icon": "person", "route": "/login" }
  ]
}
```

> **`/login` as a tab.** A page route that exists becomes a tab, `/login` included. Note the tension
> with the auth rule in [§ 6.34](#auth-forms--the-form-wrapper): login success navigates with
> `navigation_type: "go"` precisely so the user cannot go back into the login screen, and a
> persistent tab puts it one tap away again. That is fine for a small site whose login *is* a
> destination. If login should only be reachable from the drawer, drop `/login` from `pages[]` and
> point the drawer link at the engine's native `/auth/login` instead.

The engine's own routes stay shell-excluded regardless — `/auth/login` is a different route from a
merchant page at `/login`.

### Page-level `footer`

A page-level key (sibling of `appBar`/`body`) for sticky CTAs (checkout place-order, product add-to-cart). Chrome (background, shadow, padding) must be authored on the footer node, usually a `container`.

**Hard rule:** `pages[].footer` is the **only** valid output for a page-level pinned bottom bar. `stackLayer` positioning is for intra-component overlays only (badge on image, text over banner).

`**footer.overlay: true`** — optional key on the footer node (sibling of `type`). Footer floats over body content. Also emit a `sizedBox` spacer at end of `body[]` so last content clears the bar (e.g. `height: 116`).

```json
"footer": {
  "overlay": true,
  "id": "product-detail-footer",
  "type": "container",
  "props": {
    "color": "#FFFFFF",
    "borderRadius": { "topLeft": 24, "topRight": 24 },
    "padding": { "left": 16, "right": 16, "top": 16, "bottom": 12 },
    "shadow": "lg"
  },
  "child": { "...": "add-to-cart row" }
}
```

Checkout sticky CTA example:

```json
"footer": {
  "id": "checkout-footer",
  "type": "container",
  "props": { "color": "#FFFFFF", "shadow": "md", "padding": { "top": 12, "bottom": 12, "left": 16, "right": 16 } },
  "child": {
    "id": "checkout-place-order",
    "type": "button",
    "props": { "label": "تأكيد الطلب", "variant": "filled", "fullWidth": true, "trailingTextPath": "checkout.payableTotalFormatted" }
  }
}
```

> **SiteFooter vs sticky footer:** `SiteFooter` zone content also maps to `pages[].footer` (not end of `body[]`). Commerce sticky CTAs (a `makeOrder` `ContentButton`, product detail add-to-cart) use the same slot.

### `appBar` structure

The `appBar` is built from the page `SiteHeader` block and `rootProps`:

```json
{
  "id": "home-app-bar",
  "type": "appBar",
  "props": {
    "title": "SOOQ",
    "backgroundColor": "#ffffff",
    "foregroundColor": "#0f172a",
    "elevation": 0,
    "showMenu": true,
    "menuAction": { "type": "openDrawer" },
    "showCartIcon": true,
    "cartBadgePath": "cart.itemCount",
    "cartAction": { "type": "navigate", "route": "/cart" }
  }
}
```

> **Back button:** The back arrow appears automatically when the navigation stack can pop (`GoRouter.canPop()`). No prop controls it. In RTL, it renders on the visual **right** (the bar layout is internally LTR).


| Field                                                 | Condition                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `showMenu: true` + `menuAction`                       | `rootProps.headerShowDrawerButton: "on"` OR a `SiteDrawerShell` block is present |
| `showCartIcon: true` + `cartBadgePath` + `cartAction` | always (unless `rootProps.headerShowCart: "off"`)                                |


**Wishlist / favorite toggle** (product detail pages):


| Prop                                          | Notes                                                               |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `trailingIconActivePath`                      | dataContext boolean path (e.g. `wishlist.isCurrentProductFavorite`) |
| `trailingIconActive` / `trailingIconInactive` | icon names for on/off (defaults `favorite` / `favorite_outline`)    |
| `trailingActiveColor`                         | icon hex when active                                                |
| `trailingAction`                              | tap action                                                          |
| `cartVisiblePath` / `cartVisibleWhen`         | conditional cart-icon visibility                                    |
| `titleAlign`                                  | `start` (default) | `center` | `end`                                |


**Gradient background** (two modes):


| Prop                                                 | Behavior                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `backgroundGradient: true`                           | Theme-bound top→bottom gradient: `theme.colors.primary` → `theme.colors.background` |
| `backgroundGradientTop` + `backgroundGradientBottom` | Explicit hex pair; wins over theme-bound                                            |


Rules: explicit pair is all-or-nothing (one alone → solid `backgroundColor` fallback); when gradient is active, `backgroundColor` has no visual effect; direction is fixed top→bottom. Map web header brand gradient → `backgroundGradient: true`; explicit web header gradient → hex pair via `rootProps.headerBackgroundGradientTop` / `headerBackgroundGradientBottom`.

**RTL layout note:** appBar is internally LTR — cart + trailing icons render on the visual **left**, menu/back on the visual **right**. This is intended for Arabic apps.

### `appDrawer` structure

Emitted when a `SiteDrawerShell`, `ZoneDrawer`, or `SideDrawer` block is found in the page blocks (placed alongside `body` on the page node, not inside `body`):

```json
{
  "id": "drawer-1",
  "type": "appDrawer",
  "props": {
    "drawerEdge": "start",
    "width": 320,
    "backgroundColor": "#ffffff"
  },
  "child": {
    "id": "drawer-col-2",
    "type": "column",
    "props": { "gap": 0 },
    "children": [
      {
        "id": "drawer-link-3",
        "type": "button",
        "props": { "label": "الرئيسية", "variant": "text", "fullWidth": true },
        "tap": { "type": "navigate", "route": "/home", "navigation_type": "go" }
      }
    ]
  }
}
```


| Web `side`        | Mobile `drawerEdge` |
| ----------------- | ------------------- |
| `left`            | `start` (RTL-aware) |
| `right`           | `end`               |
| *(default / RTL)* | `start`             |


---

## 8. Locale Rules


| rootProp                   | Behaviour                                                                    |
| -------------------------- | ---------------------------------------------------------------------------- |
| `language: "ar"`           | Prefers `labelAr`, `titleAr`, `textAr`, `messageAr` over English equivalents |
| `direction: "rtl"`         | Default `textAlign: "right"` on all text nodes                               |
| Phone / email / password / OTP fields | Always `textDirection: "ltr"` — Latin-keyed regardless of app direction |
| `bodyFont`                 | Resolved to a family name via the font map below; `"Tajawal"` is the fallback |
| `language: "ar"` + a Latin-only `bodyFont` | Font family → `"Tajawal"` (Latin faces cannot render Arabic glyphs) |


### `bodyFont` → `theme.typography.fontFamily`

`bodyFont` holds a `FONT_OPTIONS` slug ([`docs/BLOCKS-MOBILE.md` § Font families](docs/BLOCKS-MOBILE.md#font-families-themeprops)). The converter maps it to the family name the engine loads.


| Group                        | Slug → family                                                                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arabic (renders both scripts) | `cairo`→Cairo, `tajawal`→Tajawal, `almarai`→Almarai, `ibm-plex-sans-arabic`→IBM Plex Sans Arabic, `noto-sans-arabic`→Noto Sans Arabic, `readex-pro`→Readex Pro, `rubik`→Rubik, `changa`→Changa, `el-messiri`→El Messiri, **`amiri`→Amiri**, **`noto-naskh-arabic`→Noto Naskh Arabic**, **`scheherazade-new`→Scheherazade New** |
| Latin-only                   | `dm-sans`, `inter`, `roboto`, `open-sans`, `lato`, `poppins`, `montserrat`, `raleway`, `nunito`, `manrope`, `sora`, `playfair-display`, `merriweather`, `lora`, `space-grotesk`, `geist`, `fraunces` → title-cased family name             |
| `system`                     | `"Tajawal"` when `language: "ar"`, else `"Inter"`                                                                                                                                                                                          |
| unset / unknown              | `"Tajawal"`                                                                                                                                                                                                                                |


The **bold** entries are the serif faces — `amiri` is the classic Arabic naskh serif; `noto-naskh-arabic` and `scheherazade-new` are the other two. On the Latin side the serifs are `playfair-display`, `merriweather`, `lora` and `fraunces`.

**A Latin-only slug on an Arabic store falls back to `Tajawal`** — those faces have no Arabic glyphs, so honouring the pick would render tofu. Pick an Arabic serif instead of a Latin one for an Arabic serif look.

> `fontOption1` / `fontOption2` (the web "Primary" / "Secondary" font slots) are **not** emitted — the engine theme carries a single family, and the per-block `fontFamily: "body" | "option1" | "option2"` field is dropped ([§ 6.1](#61-text--contentparagraph)).

### Theme spacing (`theme.spacing`)

The web side exposes two named spacing scales; the engine theme carries one. `theme.spacing` is the engine's inline/box scale, so it tracks the **side** scale, with `xl` borrowing the one vertical step the side scale does not reach.


| `theme.spacing` key | Source rootProp          | Fallback |
| ------------------- | ------------------------ | -------- |
| `xs`                | *(fixed)*                | `4`      |
| `sm`                | `spacingSideNarrow`      | `10`     |
| `md`                | `spacingSideMedium`      | `16`     |
| `lg`                | `spacingSideWide`        | `24`     |
| `xl`                | `spacingVerticalMedium`  | `36`     |


`spacingVerticalNarrow` and `spacingVerticalWide` are **not** emitted — the vertical rhythm already reaches the output as concrete `Section` padding numbers.

> `theme.spacing` is a **reference palette for the engine**, not something nodes resolve against: per [G3](#g3--no-theme-tokens-in-output) every node already carries concrete numbers. Changing it will not move any existing node.

---

## 9. Data-Bound Blocks

These blocks emit nodes that fetch data from the API at runtime.

### 9.1 ProductsGrid / ProductGrid

**Web input:**

```json
{
  "type": "ProductsGrid",
  "props": {
    "collection": { "id": "coll_featured" },
    "columns": "4",
    "gap": "md",
    "maxProducts": "20",
    "cardVariant": "vertical"
  }
}
```

**Mobile output:**

```json
{
  "id": "products-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 4,
    "mainAxisSpacing": 12,
    "crossAxisSpacing": 12,
    "childAspectRatio": 0.75,
    "enableInnerScroll": false,
    "requestKey": "product-list",
    "requestUrl": "/api/v1/public/collections/coll_featured/products?page=0&size=20",
    "emptyMessage": "لا توجد منتجات",
    "errorMessage": "حدث خطأ"
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.product-list.data",
    "item": {
      "id": "product-template-2",
      "type": "card",
      "props": { "elevation": 1, "borderRadius": 12 },
      "tap": { "type": "navigate", "route": "/product/details/:productId", "navigation_type": "push" },
      "child": {
        "id": "pt-body-3",
        "type": "column",
        "props": { "crossAxisAlignment": "start", "mainAxisAlignment": "start", "gap": 8 },
        "children": [
          { "id": "pt-image-4", "type": "image", "props": { "urlPath": "item.primaryImageUrl", "source": "network", "fit": "cover", "aspectRatio": 1.0 } },
          { "id": "pt-name-5", "type": "text", "props": { "valuePath": "item.name", "fontSize": 14, "fontWeight": "w600" } },
          { "id": "pt-price-6", "type": "text", "props": { "valuePath": "item.price", "fontSize": 13 } }
        ]
      }
    }
  }
}
```

**URL rules:**

- `collection: "all"` or no collection → `/api/v1/public/products?page=0&size=<n>`
- `collection: { id: "X" }` or `collection: "X"` → `/api/v1/public/collections/X/products?page=0&size=<n>`
- `metadata.apiUrl` (admin URL) → rewritten to relative public path
- Max size capped at `20`

### 9.2 CartSection

**Mobile output:**

```json
{
  "id": "cart-list-1",
  "type": "listView",
  "props": { "emptyMessage": "السلة فارغة" },
  "itemBuilder": {
    "type": "repeat",
    "source": "cart.items",
    "item": {
      "id": "cart-line-tpl-2",
      "type": "row",
      "props": { "gap": 12, "crossAxisAlignment": "center" },
      "children": [
        { "id": "cart-img-tpl-3", "type": "image", "props": { "urlPath": "item.imageUrl", "source": "network", "width": 72, "height": 72, "fit": "cover" } },
        { "id": "cart-name-tpl-4", "type": "text", "props": { "valuePath": "item.name", "fontSize": 14 } }
      ]
    }
  }
}
```

### 9.3 OrderHistory / OrderList

**Mobile output:**

```json
{
  "id": "orders-list-1",
  "type": "listView",
  "props": {
    "requestKey": "order-history",
    "requestUrl": "/api/v1/customer/orders?page=0&size=10",
    "emptyMessage": "لا توجد طلبات بعد."
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.order-history.data",
    "item": {
      "id": "order-item-2",
      "type": "card",
      "props": { "borderRadius": 8 }
    }
  }
}
```

Default size is `10`. Override with `props.maxOrders`.

### 9.4 Wishlist

**Mobile output:**

```json
{
  "id": "wishlist-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "requestKey": "wishlist",
    "requestUrl": "/api/v1/customer/wishlist",
    "emptyMessage": "قائمة المفضلة فارغة."
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.wishlist.data",
    "item": {}
  }
}
```

Default `crossAxisCount` is `2`. Override with `props.columns`.

### API path rules


| Purpose                 | Path pattern                                               |
| ----------------------- | ---------------------------------------------------------- |
| Public product catalog  | `/api/v1/public/products?page=0&size=<n>`                  |
| Collection products     | `/api/v1/public/collections/<id>/products?page=0&size=<n>` |
| Customer orders         | `/api/v1/customer/orders?page=0&size=<n>`                  |
| Customer wishlist       | `/api/v1/customer/wishlist`                                |
| Contact form submission | `/api/v1/public/contact`                                   |


Absolute admin URLs in `metadata.apiUrl` are automatically rewritten to relative public paths.

### 9.5 ValueContext binding (Group + content blocks)

Commerce UI is bound `**Group`** blocks + `**valueContext**` on content children. A bound Group opens a **binding scope**; every child `valueContext.path` resolves to `<scope base>.<field>`:


| Binding source                        | Scope base                              |
| ------------------------------------- | --------------------------------------- |
| `Group` with `cartLineId` (repeat item) | `item`                                  |
| Repeat template in a `listView` / `gridView` | `item`                             |
| `Group` with `product` (standalone card) | `dataContext.requests.product-<id>.data` |



| Web `valueContext.path`    | Mobile field | Field name         |
| -------------------------- | ------------ | ------------------ |
| `product.title`            | `valuePath`  | `name`             |
| `product.description`      | `valuePath`  | `description`      |
| `images[0].url`            | `urlPath`    | `primaryImageUrl`  |
| `pricing.displayPrice`     | `valuePath`  | `price`            |
| `pricing.displayLineTotal` | `valuePath`  | `lineTotal`        |
| `quantity`                 | `valuePath`  | `quantity`         |
| `lineId`                   | `valuePath`  | `lineId`           |
| `variantId`                | `valuePath`  | `variantId`        |


So `product.title` is `item.name` inside a cart row, and `dataContext.requests.product-prod_01.data.name` on a standalone product card. Paths outside this table keep their static value and emit a warning.

> **Open question for the mobile team:** a product-bound `Group` is emitted as a `container` carrying `requestKey` + `requestUrl` (flat in `props`, same convention as `gridView` in §9.1) wrapping the card. Confirm the engine resolves a request declared on a container node; if not, the request must be hoisted to page level and the `requestKey` kept. A warning is emitted on every conversion that produces one.


> **Not engine props:** `labelPath` on `button` and `semanticsLabelPath` on `image` are **not supported** — do not emit them. For dynamic text inside repeat templates, use a sibling `text` node with `valuePath`; keep button labels static (e.g. "+", "−", "أضف للسلة"). For image a11y, use static `semanticsLabel` / `alt` or omit.

Static fallback values remain when `fallbackToStatic: true` (editor preview only; mobile uses paths at runtime).

### 9.6 Section presets are **mostly** not a converter concern

`metadata.preset`, legacy `sectionKind`, `collection` and `cartSlotItems` are **ignored** for every preset whose content the web editor has already expanded into ordinary blocks — presets exist to make authoring easier (inserting several blocks at once with binding pre-wired), so those Sections all convert the same way and the commerce behaviour comes from the blocks themselves:


| Block                              | Emits                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Group` + `product` + `metadata`   | `container` with `requestKey`/`requestUrl` wrapping the card; children bound to that request (§9.5)  |
| `Group` + `cartLineId`             | `listView` + `itemBuilder.repeat` over `cart.items`, the Group's content as the item template        |
| Additional `cartLineId` Groups     | Dropped with a warning — they are the same row repeated; one `listView` already renders the whole cart |
| `ContentButton` + `makeOrder`      | Hoisted to `pages[].footer` as a sticky CTA                                                          |
| `ContentButton` + `cartQtyIncrease` / `cartQtyDecrease`, `CartQuantity` | `cubitCall cart.updateQuantity` (§6.5)                           |
| `Group` card template in a `products-grid` / `products-page` Section | `gridView` + `itemBuilder.repeat` over the collection request — the one preset the converter does read (§9.7) |


A Section carrying a preset id but **no** content and **no** `cardTemplate` converts to an empty container — there are no blocks to convert. Conversion is verified preset-agnostic by test *"ignores metadata.preset / sectionKind once the preset content is expanded"*: the same blocks with and without preset metadata produce byte-identical output (ids aside).

### 9.7 Products Grid / Products Page: the unexpanded card template

The one exception to §9.6. `products-grid` and `products-page` Sections are **not** expanded on the web side: `content` holds exactly **one** card-template `Group` with `product: null`, and the web repeater clones it per product at render time ([`docs/BLOCKS.md` § *Section presets: the one-template-card contract*](docs/BLOCKS.md#section-presets-the-one-template-card-contract) — that contract is only written up in the wider web reference, not in `BLOCKS-MOBILE.md`). Mobile has the same primitive, so the template maps onto a `gridView` + `itemBuilder.repeat`.

**Trigger** — all of these must hold, otherwise the Section converts as a plain Section (§9.6):

- `metadata.preset` (or `sectionKind`) is `"products-grid"` or `"products-page"`
- `content` is exactly one block — or `content` is empty and `cardTemplate` holds exactly one
- that block is a `Group` with no `product` picker ref

**Mobile output:**

```json
{
  "id": "products-grid-7",
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "mainAxisSpacing": 16,
    "crossAxisSpacing": 16,
    "childAspectRatio": 0.75,
    "enableInnerScroll": false,
    "requestKey": "product-list",
    "requestUrl": "/api/v1/public/collections/coll_featured/products?page=0&size=20",
    "emptyMessage": "لا توجد منتجات",
    "errorMessage": "حدث خطأ"
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.product-list.data",
    "item": { "…the template Group, children bound to item.* per §9.5…" }
  }
}
```

| Web | Mobile |
| --- | --- |
| `columnsMobile` (else `columns`, else `2`) | `crossAxisCount` |
| `gridGap` | `mainAxisSpacing` / `crossAxisSpacing` |
| `collection.id`, else `collection.slug` (`products-grid`) | collection segment of `requestUrl` (§9.1 URL rules, size capped at 20) |
| no collection picker (`products-page`) | `/api/v1/public/products?page=0&size=20` — the search / category / pagination controls sit in the wrapper Section and filter at runtime |
| template children `valueContext` | `valuePath` / `urlPath` on `item.*` (§9.5 binding table) |

The Section's own padding / background still wrap the grid, exactly as for a plain Section — only the children wrapper is replaced.


---

## 10. Unsupported Blocks

**Mobile block set** — blocks from [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md) that do *not*
produce a straightforward node:


| Web block                       | Mobile output                                                                        | Note                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `Chip`                          | `null` (skipped) + warning                                                           | Renders a runtime array (`listValueContext`) with no chip-list primitive and no valueContext path mapping. [§ 6.37](#637-chip) |
| `ButtonGroup` (`static`)        | `row` of `button` nodes; the `defaultSelectedValue` item gets `variant: "filled"`     | Selection state is **not** tracked on mobile — each button just runs its own destination. [§ 6.36](#636-buttongroup)           |
| `ButtonGroup` (`categories` / `pagination`) | `unsupported` + warning                                                  | Items are generated from runtime store data.                                                                                  |
| `Blank`                         | `null` (omitted entirely)                                                            | [§ 6.28](#628-blank)                                                                                                          |
| `ZoneDrawer`                    | Page-level `appDrawer` from `slot[]`                                                 | Site zone, never in `body[]`. [§ 6.38](#638-zonedrawer--zonebottomsheet)                                                       |
| `ZoneBottomSheet`               | `openBottomSheet` when triggered by `ContentButton` / `ButtonGroup` `destinationType: "zone"` | Otherwise dropped (with a warning) or `unsupported`                                                                   |


**LEGACY / web-only** — outside the mobile block set ([§ 6B](#6b--legacy-web-blocks-not-in-the-mobile-block-set)):


| Web block                       | Mobile output                                                                        | Note                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `CategoryListMenu`              | `{ "type": "unsupported", "props": { "blockType": "CategoryListMenu" } }` + warning  | No static decomposition. If this merchant has a categories screen, wire a navigate button manually; otherwise omit the block. |
| `ProductSearchMenu`             | `{ "type": "unsupported", "props": { "blockType": "ProductSearchMenu" } }` + warning | Needs cubit wiring. If this merchant has a search screen, wire manually; otherwise omit.                                      |
| `ProductVariants`               | `{ "type": "unsupported", "props": { "blockType": "ProductVariants" } }` + warning   | Variant matrix selection needs cubit state the engine has no primitive for.                                                   |
| `SideDrawer`                    | Handled as `SiteDrawerShell` (generates `appDrawer`)                                 |                                                                                                                               |
| `SiteHeader`                    | Not in `body[]` — used to build `appBar`                                             | Site zone; ingest still live ([§ 7](#7-page-envelope-structure))                                                               |
| `SiteFooter`                    | Page-level `footer` key (not in `body[]`)                                            | Site zone; ingest still live                                                                                                  |
| `ZonePopup`                     | `openBottomSheet` when triggered by `destinationType: "zone"`                        | Otherwise `unsupported` + warning. Replaced by `ZoneBottomSheet` in the mobile set                                            |
| `LoginButton`                   | Navigate stub to `/auth/login` or omitted when appBar handles auth                   | Replaced by `ContentButton` `buttonAction: "login"` ([§ 6.34](#634-contentinput))                                              |
| `CartIconButton`                | Covered by `appBar.showCartIcon` when header present                                 |                                                                                                                               |
| `ContentHtml`                   | → `richtext`, see [§ 6.3](#63-richtext--contenthtml)                                 |                                                                                                                               |
| `SiteDrawerShell`               | Not in `body[]` — emitted as `appDrawer` on the page node                            |                                                                                                                               |
| `Template`                      | Flattened (wrapper discarded)                                                        |                                                                                                                               |
| `CartList`                      | `null` (skipped) + warning                                                           | A web **preset**, not a block — must be expanded into a `cartLineId` `Group` before export                                    |


**Unknown block types with children** → wrapped in a `container` + `column` with the children converted; a warning is emitted.  
**Unknown leaf block types** → `null` (skipped); a warning is emitted.

### Warnings

The converter accumulates warnings and returns them in `{ success: true, output: ..., warnings: ["..."] }`. Watch for:

- `"Nested Section detected; converted as sibling container"`
- `"Block type \"CategoryListMenu\" has no mobile equivalent; rendered as unsupported. If this merchant has a categories screen, wire a navigate button manually; otherwise omit the block."`
- `"Block type \"ProductSearchMenu\" has no mobile equivalent; rendered as unsupported. If this merchant has a search screen, wire manually; otherwise omit."`
- `"Sidebar dock prop is ignored on mobile; rendered as inline column"`
- `"Testimonials CMS source not supported; using inline items only"`
- `"ButtonGroup selection state is not tracked on mobile; converted to a row of buttons…"`
- `"Chip renders a runtime array from \"<path>\"… block skipped"`
- `"SiteHeader.rightSlot blocks [<types>] have no appBar equivalent…"`
- `"ContentLink icon \"<name>\" dropped; the engine `button` has no icon prop"`
- `"ContentInput \"<id>\" uses inputAction \"search_products\"…"`
- `"Auth \"login\" form has no \"phone\" field (found \"<id>\"); the engine's auth cubit is a phone/OTP flow and cannot bind any other credential…"` — [§ 7.2](#72-authlogin-binds-phone--never-email)
- `"ContentSwitch \"<id>\" uses switchAction \"<action>\"; the mobile field is emitted as a plain switchField without store wiring…"`
- `"ContentSwitch \"<id>\" helperText dropped; the engine switchField has no helper-text prop"`
- `"Overlay zone \"<key>\" is never opened on route \"<route>\"; nothing triggers it, so its content was dropped…"`
- `"ZonePopup \"<key>\" is inactive (is_active: false); overlay skipped"`
- `"Multiple drawer zones found; \"<key>\" dropped — mobile supports one appDrawer per page"`
- `"Unknown block type \"<X>\"; converted children only"`
- `"Unsupported leaf block type \"<X>\"; skipped"`

---

## 11. Validation Checklist

Use this checklist before sending converter output to the engine.

### Schema / parse

- All `type` values are from Section 2 — `**scaffold` is NOT valid output**
- Every node has `id`, `type`, `props`
- No `child` + `children` on the same node
- Prefer flat `props`; `style` object only for: `padding`, `margin`, `borderRadius`, `border`, `shadow`, `background`/`color`, `width`, `height`
- No web block type names in output

### Props / values

- No `theme-*` strings, no `px` strings, no `colorMode`/`colorTheme`/`colorFixed`
- Prefer canonical `mainAxisAlignment`/`crossAxisAlignment`/`textAlign` (shorthand is engine-accepted)
- Font weight ∈ { `w100`–`w900`, `light`, `normal`, `medium`, `semibold`, `bold` } — **no camelCase, no `thin`/`extraBold`/`black`**
- Web `semibold` → `"semibold"` or `"w600"` (not `"bold"`)
- Button `variant` ∈ { `elevated`, `filled`, `outlined`, `text` }
- `image.url` (not `src`); `image.semanticsLabel` or `alt`
- `text.value` / `richtext.value` (not `text`/`richtext`)
- `imageSlider.autoPlay` (capital P), `imageSlider.images[].url`
- `videoPlayer.showControls` / `autoplay` (drop `loop`/`muted` — not read)

### Forms

- `textFormField` field key is `props.id` (**never `name`**)
- `form` uses `props.formId` (production also mirrors it as `id`; both accepted, renderer reads `formId` first)
- Submit button `tap.formId` matches the form's `formId`
- `form` uses `child` OR `children`, not both
- Every `textFormField` / `switchField` sits inside a `form` — a field with no enclosing form cannot be submitted
- Auth submit (`cubitCall auth.login`) carries `requireValidForm: true` + `formId` + `source: "form"` params
- `auth.login` params contain **`phone`**, never `email` / `username` — the auth cubit is a phone/OTP flow ([§ 7.2](#72-authlogin-binds-phone--never-email))
- An auth page is `layout: "centered"` with **no `scroll` key**, and `body[0]` is a `container` `expand: true` wrapping a `column` `mainAxisSize: max` ([§ 7.1](#71-auth-and-splash-pages-use-layout-centered-not-scroll-none))
- `scroll: "none"` appears only on pages whose body has an inner scroller (`enableInnerScroll: true`) — never on a static form
- `switchField` initial state is the **string** `"true"` / `"false"`, never a boolean
- `textDirection: "ltr"` on email, phone, password and OTP fields

### Actions

- Navigation/actions on node-level `tap`, never in `props`
- No `buttonAction`/`link`/`href` in `props`
- YouTube → `image` + `tap.openUrl`
- `addToCart` → `cubitCall` cart; `logout` → `cubitCall` auth + `onSuccess` navigate

### Page assembly

- `appBar` is a page-level key (sibling of `body`), not inside `body[]`
- No `showBackButton` emitted (back arrow is automatic)
- No `scaffold` node; page background/scroll via page-level keys
- `SiteDrawerShell` / `ZoneDrawer` → page-level `appDrawer`
- Pinned/sticky CTA bars → page-level `footer`, never end of `body[]` and never stack overlay for page footers
- `footer.overlay: true` only when design floats bar over content; then emit end-of-body `sizedBox` spacer
- `contactButton` has `props.target` or `props.targetPath` **and** node-level `tap: openContact` (same target)
- `button.height` only when non-default (`sm`→36, `lg`→56); omit for `md`; never on `contactButton`
- No literal `"ghost"`/`"primary"` in output — §5 variant map applied (`ghost` → `text`)
- Radio-style single-choice blocks → `radioGroup` (not column of buttons)
- `openBottomSheet.child` is a full component node (root has `id`, `type`, `props`)
- Cart quantity buttons → `cubitCall cart.updateQuantity` with `variantId` (`source: "item"`) + `delta` (`source: "value"`) — never `increaseQuantity`/`decreaseQuantity`, never `lineId`
- cubitCall param `source` ∈ { `form`, `tap`, `item`, `dataContext`/`context`, `pageState`, `routeParams`, `authState`, `app`, `value` } — `**data` is only valid in `visibleWhen`**
- No `labelPath` on `button`, no `semanticsLabelPath` on `image` — use static labels or sibling `text` + `valuePath`
- `verifyOtp` includes `formId` + `params.phone` (`source: "authState"`)
- Web boolean toggles → `switchField` (value stored as `"true"`/`"false"` strings)
- AppBar gradient: `backgroundGradient: true` or the full explicit hex **pair** — never a single hex gradient prop
- Every generated non-tab route appears in **both** `pages[]` and `navigation.shellExcludeRoutes`
- Every `navigation.tabs[].route` has a matching `pages[].route` — a tab with no page behind it navigates nowhere ([§ 7.3](#73-tabs-are-derived-from-the-pages))
- `navigation.tabs` holds at most 5 entries, `/home` first
- No email fields in address forms — guest email goes to `/checkout` contact card → `placeOrder.params.guestEmail`

### API / data

- Relative paths only; `requestKey` + `requestUrl` flat in `props`
- `itemBuilder.source` = `dataContext.requests.<requestKey>.data`; cart uses `cart.items`

### Merchant-specific (no assumptions)

- No hard-coded route targets that may not exist in this merchant's `pages[]`
- Blocks with no automatic equivalent → `unsupported` + a clear warning (not a guessed navigate button)

---

## 12. Known Limitations

These are by design — the mobile team should not expect different output for these:


| Item                                            | Reason                                                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| YouTube in `videoPlayer`                        | Flutter `video_player` supports MP4/HLS only                                                                                     |
| `fontFamily` on text nodes                      | Not in engine schema — deleted                                                                                                   |
| `lineHeight` as standalone prop                 | Not in engine schema — deleted                                                                                                   |
| `wrap: "wrap"` on Flex/Group                    | No native flex-wrap                                                                                                              |
| `backgroundAttachment: fixed` on Hero           | No Flutter scroll-attachment equivalent                                                                                          |
| `showArrows` / `slidesPerView` on `imageSlider` | Not in engine schema — omitted                                                                                                   |
| `anchorId` on Section                           | No in-page anchor scroll on mobile                                                                                               |
| `align` / `maxWidth` on `image`                 | Wrap image in `container` instead                                                                                                |
| `CheckoutForm` as single page                   | Multi-route flow: `/checkout`, `/checkout/address`, `/checkout/payment`                                                          |
| `CategoryListMenu`                              | Runtime category data — emits `unsupported` node. Do **not** auto-navigate to `/categories`; wire manually per merchant.         |
| `ProductSearchMenu`                             | Needs cubit + search field wiring — emits `unsupported` node. Do **not** auto-navigate to `/search`; wire manually per merchant. |
| Wishlist `itemBuilder.item`                     | Empty object `{}` — renderer builds its own template                                                                             |


---

## 13. Block Convertibility Matrix

Scoped to the **mobile block set** ([`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md)). All 22 types are
listed; nothing is omitted.

### Fully convertible (mobile block set)


| Block              | Mobile output                                | Section |
| ------------------ | -------------------------------------------- | ------- |
| `Accordion`        | `column` of `expansionTile`                  | [6.15](#615-accordion) |
| `ContentButton`    | `button` + node-level `tap`                  | [6.5](#65-button--contentbutton) |
| `ContentDivider`   | `divider`                                    | [6.9](#69-divider--contentdivider) |
| `ContentHeading`   | `text`                                       | [6.2](#62-heading--contentheading) |
| `ContentIcon`      | `icon`                                       | [6.7](#67-icon--contenticon) |
| `ContentImage`     | `image`                                      | [6.8](#68-image--contentimage) |
| `ContentInput`     | `textFormField` (+ `form` for auth sections)  | [6.34](#634-contentinput) |
| `ContentLink`      | `button` `variant: "text"`                    | [6.6](#66-link) |
| `ContentParagraph` | `text`                                       | [6.1](#61-text--contentparagraph) |
| `ContentSwitch`    | `switchField`                                 | [6.35](#635-contentswitch) |
| `Flex`             | `row` / `column`                              | [6.18](#618-group--flex) |
| `Grid`             | `gridView`                                    | [6.19](#619-grid-layout) |
| `Group`            | `row` / `column`, wrapped in `container` when styled | [6.18](#618-group--flex) |
| `ImageGallery`     | `imageSlider` (slider) / `gridView` (grid)     | [6.16](#616-imagegallery-slider-mode) |
| `Section`          | `container` + `column` / `gridView` / `stack`  | [6.17](#617-section) |
| `Testimonials`     | `column` of `card` (inline source only)        | [6.25](#625-testimonials) |
| `VideoEmbed`       | `image` + `openUrl` (YouTube) / `videoPlayer` (MP4-HLS) | [6.11](#611-videoembed-youtube) |
| `ZoneDrawer`       | page-level `appDrawer`                         | [6.38](#638-zonedrawer--zonebottomsheet) |


### Cannot convert automatically (mobile block set)


| Block                                       | Output                                               | Reason |
| ------------------------------------------- | ---------------------------------------------------- | ------ |
| `Chip`                                      | omitted + warning                                    | Runtime array via `listValueContext`; no chip-list primitive and no array path in the binding table |
| `ButtonGroup` (`categories` / `pagination`) | `unsupported` + warning                              | Items generated from runtime store data |
| `Blank`                                     | omitted                                              | Dev-only placeholder |
| `ZoneBottomSheet` with no trigger           | dropped + warning (or `unsupported` in `body[]`)     | Reaches mobile only through the tap that opens it |


### Partial / lossy (mobile block set)


| Block / pattern                | Gap                                                                       |
| ------------------------------ | ------------------------------------------------------------------------- |
| `ButtonGroup` (`static`)       | Converts, but **selection state is not tracked** — a row of independent buttons |
| `ContentInput` `inputAction`   | Store binding (`search_products`, `filter_*`, `profile_*`, `address_*`) not wired |
| `ContentSwitch` `switchAction` | Store binding (`filter_in_stock_only`, `marketing_*`, `address_is_default`) not wired |
| `Group` + `cartLineId`         | Web localStorage row → one `listView` over the `cart.items` cubit          |
| `Group` + `product`            | Per-card request on a `container` ([§ 9.5](#95-valuecontext-binding-group--content-blocks) open question) |
| `Testimonials` CMS source      | Inline fallback only                                                      |
| `layout.hideOnMobile`          | Block omitted (or `visibleWhen` when convertible)                         |
| `Group` `wrap: "wrap"`         | No native flex-wrap; approximated with a warning                           |


### Partial / lossy — props with no engine equivalent


| Block            | Dropped props                                                                     |
| ---------------- | --------------------------------------------------------------------------------- |
| `ContentButton`  | `textColor`, `radius`, `align` (engine `button` accepts only `color`)              |
| `ContentLink`    | `icon` / `iconPosition`, `hoverEffect`, `hoverColor`, `fontSize`                  |
| `ContentInput`   | `debounceMs`, `inputAction`, `valueContext`                                       |
| `ContentSwitch`  | `helperText`, `labelPosition`, `switchAction`, `checkedValueContext`              |
| `ContentParagraph` / `ContentHeading` | `fontFamily`, `lineHeight`                                   |
| `ButtonGroup`    | `*Style.textColor`, `*Style.radius`, `value` / `defaultSelectedValue` semantics    |
| `Section`        | `anchorId`, `maxWidth`, `theme`                                                   |
| `Group`          | `wrap`, `backgroundOverlayColor`                                                  |
| `Accordion`      | `backgroundColor`, `textColor`                                                    |
| `ImageGallery`   | `showArrows`, `slidesPerView`, `gridRows`                                         |
| `ZoneDrawer` / `ZoneBottomSheet` | `is_mobile_only`, `overlay`, `showCloseButton`, `maxHeight` (engine-owned chrome) |


### LEGACY blocks

Outside the mobile block set; converter behaviour retained for old payloads only —
[§ 6B](#6b--legacy-web-blocks-not-in-the-mobile-block-set) and [§ 10](#10-unsupported-blocks).

*Cannot convert:* `CategoryListMenu`, `ProductSearchMenu`, `ProductVariants`, `CartList`.
*Handled elsewhere:* `SiteHeader`, `SiteFooter`, `SiteDrawerShell`, `SideDrawer`, `ZonePopup`, `CartIconButton`, `LoginButton`, `Template`.
*Convert but frozen:* `Text`, `Heading`, `RichText` / `ContentHtml`, `Space`, `Button`, `Link`, `Icon`, `Image`, `Video`, `Hero`, `Card`, `Badge`, `Stats`, `Logos`, `ContactForm`, `NavMenu`, `Sidebar`, `RowGroup`, `CartItem`, `CartQuantity`, `CartSection`, `CartSummary`, `CheckoutForm`, `CheckoutSummary`, `OrderHistory` / `OrderList`, `OrderDetails`, `Wishlist`, `ProductsGrid`, `ProductCard`, `ProductCarousel`, `ProductImage`, `ProductInfo`, `ProductDetails`, `ProductImageCarousel`, `TestimonialCard`, `TestimonialGrid`, `Countdown`, `SearchModal`, `CookieConsent`, `Logo`.

---

## 14. Worked Example A — Three-Page Commerce Site JSON

A commerce store on the default theme: **`home` · `login` · `products`**. Available as the first
preset in the converter playground (`lib/transformer.ts` → `EXAMPLE_PRESETS[0]`) — run it there to
see the full output. It converts with **zero warnings**.

*For a content site on a fully customised theme, see [§ 15](#15-worked-example-b--two-page-content-site-custom-theme).*

Every block in it comes from [`docs/BLOCKS-MOBILE.md`](docs/BLOCKS-MOBILE.md). Deliberately absent:
`SiteHeader`, `SiteFooter`, `ZonePopup`, `Space`, `RowGroup`, `Hero`, `Card`, `Stats` — none are in the
block set.

### Page roles


| Page       | Route (in) | Route (out) | What it exercises |
| ---------- | ---------- | ----------- | ----------------- |
| Home       | `/`        | `/home`     | **Static blocks only.** `ContentHeading`, `ContentParagraph`, `ContentImage`, `ContentIcon`, `ContentDivider`, `Flex`, `Group`, `ImageGallery` (slider), `VideoEmbed`, `Testimonials`, `Accordion`. No data binding, no cubit calls |
| Login      | `/login`   | `/login`    | **A real form.** `ContentInput` × 2 (`phone` + `password`) + `ContentSwitch` + `ContentButton` (`buttonAction: "login"`) inside one `Section` ⇒ `form` wrapper + `cubitCall auth.login`, page on the `layout: "centered"` shell |
| Products   | `/products`| `/products` | **Products Grid preset.** One unexpanded card-template `Group` ⇒ `gridView` + `itemBuilder.repeat` over the collection request |


The site-level `zones` carry one `ZoneDrawer` — the only site zone in the block set — which becomes
the page-level `appDrawer` on **all three** pages and turns on `appBar.showMenu`.

### Envelope shape

```json
{
  "schemaVersion": "1.0",
  "app": { "name": "…", "bundleId": "…", "apiBaseUrl": "…", "tenantId": "…", "tenantSlug": "…" },
  "theme": { "mode": "light", "colors": { }, "typography": { }, "radius": { }, "spacing": { }, "buttons": { } },
  "navigation": {
    "type": "tabs",
    "initialRoute": "/splash",
    "shellExcludeRoutes": ["/splash", "…", "/checkout", "/orders"],
    "tabs": [
      { "id": "tab-home",     "label": "الرئيسية",      "icon": "home",      "route": "/home" },
      { "id": "tab-login",    "label": "تسجيل الدخول", "icon": "person",    "route": "/login" },
      { "id": "tab-products", "label": "المنتجات",     "icon": "grid_view", "route": "/products" }
    ]
  },
  "pages": [
    { "id": "page-home",     "route": "/home",     "scroll": "vertical", "appBar": { }, "body": [ ], "appDrawer": { } },
    { "id": "page-login",    "route": "/login",    "layout": "centered", "appBar": { }, "body": [ ], "appDrawer": { } },
    { "id": "page-products", "route": "/products", "scroll": "vertical", "appBar": { }, "body": [ ], "appDrawer": { } }
  ]
}
```

Three pages, three tabs — the bar is derived from `pages[]`, so no tab points at a route this app
does not have ([§ 7.3](#73-tabs-are-derived-from-the-pages)). `shellExcludeRoutes` therefore holds
only the engine's own routes; `/` normalises to `/home`, which is the first tab.

### 14.1 Home — static blocks

The hero `Section` (`paddingHorizontal: "16px"`, `backgroundColor: "#f6f8fc"`, `columnsMobile: 1`):

**Web input (abridged):**

```json
{
  "type": "Section",
  "props": {
    "name": "الترحيب", "visible": true,
    "paddingTop": "40px", "paddingBottom": "32px", "paddingHorizontal": "16px",
    "backgroundColor": "#f6f8fc", "columns": 1, "columnsMobile": 1, "gridGap": "16px",
    "content": [
      { "type": "ContentHeading", "props": { "text": "أهلاً بك في متجري", "level": "1", "textAlign": "center", "fontSize": "theme-2xl", "fontWeight": "theme-bold", "color": "theme-text" } },
      { "type": "ContentParagraph", "props": { "text": "تشكيلة مختارة بعناية…", "textAlign": "center", "fontSize": "theme-md", "fontWeight": "theme-light", "color": "theme-neutral" } },
      { "type": "ContentImage", "props": { "src": "https://…", "alt": "صورة البانر الرئيسي", "objectFit": "cover", "radius": "theme-lg", "maxWidth": "100%" } },
      { "type": "ContentButton", "props": { "label": "تصفّح المنتجات", "align": "center", "destinationType": "link", "link": { "kind": "page", "pageId": "/products" }, "buttonVariantMode": "variant", "buttonVariant": "primary", "buttonVariantSize": "lg" } }
    ]
  }
}
```

**Mobile output:**

```json
{
  "id": "section-container-7",
  "type": "container",
  "props": { "color": "#f6f8fc", "padding": { "top": 40, "bottom": 32, "left": 16, "right": 16 } },
  "child": {
    "id": "section-column-5",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [
      { "id": "heading-1", "type": "text", "props": { "value": "أهلاً بك في متجري", "fontSize": 28, "fontWeight": "bold", "textAlign": "center", "color": "#14243f" } },
      { "id": "text-2", "type": "text", "props": { "value": "تشكيلة مختارة بعناية…", "fontSize": 16, "textAlign": "center", "fontWeight": "normal", "color": "#6b7d93" } },
      { "id": "image-3", "type": "image", "props": { "url": "https://…", "source": "network", "semanticsLabel": "صورة البانر الرئيسي", "fit": "cover", "borderRadius": 24 } },
      {
        "id": "button-4",
        "type": "button",
        "props": { "label": "تصفّح المنتجات", "variant": "elevated", "height": 56 },
        "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
      }
    ]
  }
}
```

Points worth noting:

- `level: "1"` drives `fontSize: 28` + `fontWeight: "bold"` — the web `fontSize: "theme-2xl"` is **not**
  what produces 28 here; heading level wins ([§ 6.2](#62-heading--contentheading)).
- `radius: "theme-lg"` → `borderRadius: 24`, on the spacing scale — see the
  [§ 5 known deviation](#5-token-resolution-tables).
- `buttonVariantSize: "lg"` → `height: 56`. An `md` button emits no `height` at all.
- `maxWidth` and `align` on `ContentImage` are dropped ([§ 6.8](#68-image--contentimage)).

The features strip shows the mobile-set replacement for the legacy `Card` block — a `Group` with
surface styling, which becomes a **`container` wrapping a `column`**:

```json
{
  "id": "group-surface-14",
  "type": "container",
  "props": { "color": "#f6f8fc", "padding": { "top": 16, "bottom": 16, "left": 16, "right": 16 }, "borderRadius": 16, "shadow": "sm" },
  "child": {
    "id": "column-10",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "center", "gap": 8 },
    "children": [
      { "id": "icon-11", "type": "icon", "props": { "name": "local_shipping", "size": 32, "color": "#0b78c5" } },
      { "id": "heading-12", "type": "text", "props": { "value": "توصيل سريع", "fontSize": 16, "fontWeight": "semibold", "textAlign": "center", "color": "#14243f" } },
      { "id": "text-13", "type": "text", "props": { "value": "٢-٤ أيام عمل", "fontSize": 14, "textAlign": "center", "color": "#6b7d93" } }
    ]
  }
}
```

### 14.2 Login — form + `cubitCall auth.login`

One `Section` holding both inputs and the submit button. Because it does, the converter wraps its
content in a `form` and the button submits it instead of navigating
([§ 6.34 auth forms](#auth-forms--the-form-wrapper)).

**Web input:**

```json
{
  "path": "/login", "slug": "/login", "name": "تسجيل الدخول", "title": "تسجيل الدخول",
  "content": [{
    "type": "Section",
    "props": {
      "name": "نموذج الدخول", "visible": true,
      "paddingTop": "48px", "paddingBottom": "48px", "paddingHorizontal": "24px",
      "backgroundColor": "#ffffff", "maxWidth": "480px", "columns": 1, "columnsMobile": 1,
      "content": [
        { "type": "ContentHeading", "props": { "text": "تسجيل الدخول", "level": "1", "textAlign": "center" } },
        { "type": "ContentParagraph", "props": { "text": "أدخل رقم هاتفك وكلمة المرور للمتابعة.", "textAlign": "center", "fontSize": "theme-sm" } },
        { "type": "ContentInput", "props": { "label": "رقم الهاتف", "name": "phone", "inputType": "tel", "placeholder": "09xxxxxxxx", "required": true } },
        { "type": "ContentInput", "props": { "label": "كلمة المرور", "name": "password", "inputType": "password", "placeholder": "••••••••", "required": true } },
        { "type": "ContentSwitch", "props": { "label": "تذكّرني", "name": "rememberMe", "defaultChecked": false, "switchAction": "" } },
        { "type": "ContentButton", "props": { "label": "دخول", "align": "center", "destinationType": "action", "buttonAction": "login", "submitRedirectUrl": "/", "buttonVariantMode": "variant", "buttonVariant": "primary", "buttonVariantSize": "lg" } },
        { "type": "ContentDivider", "props": { "thickness": "1px", "colorMode": "theme", "colorTheme": "neutral" } },
        { "type": "ContentLink", "props": { "title": "العودة إلى الرئيسية", "link": { "kind": "page", "pageId": "/" }, "align": "center", "color": "theme-primary", "fontSize": "theme-sm" } }
      ]
    }
  }]
}
```

**Mobile output (page node):**

```json
{
  "id": "page-login",
  "route": "/login",
  "title": "تسجيل الدخول",
  "background": "#ffffff",
  "layout": "centered",
  "appBar": {
    "id": "login-app-bar",
    "type": "appBar",
    "props": {
      "title": "تسجيل الدخول", "backgroundColor": "#ffffff", "foregroundColor": "#0f172a", "elevation": 0,
      "showMenu": true, "menuAction": { "type": "openDrawer" },
      "showCartIcon": true, "cartBadgePath": "cart.itemCount", "cartAction": { "type": "navigate", "route": "/cart" }
    }
  },
  "body": [
   {
    "id": "page-expand-84",
    "type": "container",
    "props": { "expand": true, "color": "#ffffff" },
    "child": {
     "id": "page-center-85",
     "type": "column",
     "props": { "mainAxisAlignment": "center", "crossAxisAlignment": "stretch", "mainAxisSize": "max" },
     "children": [
    {
      "id": "section-container-77",
      "type": "container",
      "props": { "color": "#ffffff", "padding": { "top": 48, "bottom": 48, "left": 24, "right": 24 } },
      "child": {
        "id": "form-75",
        "type": "form",
        "props": { "formId": "login-form", "id": "login-form" },
        "child": {
          "id": "section-column-74",
          "type": "column",
          "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
          "children": [
            { "id": "heading-66", "type": "text", "props": { "value": "تسجيل الدخول", "fontSize": 28, "fontWeight": "bold", "textAlign": "center", "color": "#14243f" } },
            { "id": "text-67", "type": "text", "props": { "value": "أدخل رقم هاتفك وكلمة المرور للمتابعة.", "fontSize": 14, "textAlign": "center", "fontWeight": "normal", "color": "#6b7d93" } },
            { "id": "input-68", "type": "textFormField", "props": { "id": "phone", "label": "رقم الهاتف", "hint": "09xxxxxxxx", "textDirection": "ltr", "keyboardType": "phone", "validatePhone": true, "validateRequired": true } },
            { "id": "input-69", "type": "textFormField", "props": { "id": "password", "label": "كلمة المرور", "hint": "••••••••", "textDirection": "ltr", "obscureText": true, "validateRequired": true } },
            { "id": "switch-70", "type": "switchField", "props": { "id": "rememberMe", "label": "تذكّرني", "activeColor": "#0b78c5" } },
            {
              "id": "button-71",
              "type": "button",
              "props": { "label": "دخول", "variant": "elevated", "height": 56 },
              "tap": {
                "type": "cubitCall",
                "cubit": "auth",
                "method": "login",
                "requireValidForm": true,
                "formId": "login-form",
                "params": {
                  "phone": { "source": "form", "field": "phone" },
                  "password": { "source": "form", "field": "password" }
                },
                "onSuccess": { "type": "navigate", "route": "/home", "navigation_type": "go" }
              }
            },
            { "id": "divider-72", "type": "divider", "props": { "thickness": 1, "color": "#6b7d93" } },
            {
              "id": "link-73",
              "type": "button",
              "props": { "label": "العودة إلى الرئيسية", "variant": "text", "color": "#0b78c5" },
              "tap": { "type": "navigate", "route": "/home", "navigation_type": "push" }
            }
          ]
        }
      }
    }
     ]
    }
   }
  ],
  "appDrawer": { "…": "from the ZoneDrawer site zone" }
}
```

Points worth noting:

- The page is `layout: "centered"` with **no `scroll` key**, and `body[]` is the `expand` container +
  centered column shell. The converter adds both because the page holds an auth form — do not
  hand-author `scroll: "none"` here ([§ 7.1](#71-auth-and-splash-pages-use-layout-centered-not-scroll-none)).
- The credential is `phone`, never `email` — the engine's auth cubit is a phone/OTP flow
  ([§ 7.2](#72-authlogin-binds-phone--never-email)).
- The `form` sits **inside** the Section's `container` and **outside** the `column` — chrome stays on
  the container, field scope on the form.
- `rememberMe` is collected for form validity but **excluded from `params`** — it is a UI preference,
  not a credential.
- `submitRedirectUrl: "/"` → `onSuccess` navigate to `/home` with `navigation_type: "go"` (replace, not
  push — you must not be able to go "back" into a login screen).
- `password` gets `textDirection: "ltr"` and `obscureText: true`; `tel` gets `keyboardType: "phone"` +
  `validatePhone`.
- The engine requires an `auth` cubit exposing `login`. A `login` button with **no** sibling inputs
  still emits the old navigate stub to the native `/auth/login` screen.

### 14.3 Products — the Products Grid preset

The preset Section is not expanded on the web side: `content` holds exactly **one** card-template
`Group` with `product: null`. See [§ 9.7](#97-products-grid--products-page-the-unexpanded-card-template)
for the trigger conditions.

**Web input:**

```json
{
  "type": "Section",
  "props": {
    "name": "Featured", "visible": true,
    "paddingTop": "16px", "paddingBottom": "40px", "paddingHorizontal": "16px",
    "maxWidth": "1280px", "columns": 3, "columnsMobile": 2, "gridGap": "16px",
    "metadata": { "preset": "products-grid" },
    "collection": { "id": "coll_featured", "name": "Featured", "slug": "featured", "productCount": 24 },
    "content": [{
      "type": "Group",
      "props": {
        "product": null, "metadata": null,
        "direction": "column", "gap": 10, "alignItems": "stretch",
        "backgroundColor": "theme-surface", "padding": "12px", "borderRadius": "theme-md", "boxShadow": "sm",
        "language": "ar",
        "content": [
          { "type": "ContentImage", "props": { "src": "https://placehold.co/400x400", "valueContext": { "path": "images[0].url" }, "alt": "صورة المنتج", "altValueContext": { "path": "product.title" }, "objectFit": "cover", "radius": "theme-md" } },
          { "type": "ContentHeading", "props": { "text": "اسم المنتج", "valueContext": { "path": "product.title" }, "level": "3", "textAlign": "right" } },
          { "type": "ContentParagraph", "props": { "text": "٠ ل.س", "valueContext": { "path": "pricing.displayPrice" }, "textAlign": "right", "fontSize": "theme-sm", "fontWeight": "theme-semibold", "color": "theme-primary" } },
          { "type": "ContentButton", "props": { "label": "إضافة إلى السلة", "align": "center", "destinationType": "action", "buttonAction": "addToCart", "buttonVariantMode": "variant", "buttonVariant": "primary", "buttonVariantSize": "sm" } }
        ]
      }
    }]
  }
}
```

**Mobile output:**

```json
{
  "id": "section-container-97",
  "type": "container",
  "props": { "color": "#ffffff", "padding": { "top": 16, "bottom": 40, "left": 16, "right": 16 } },
  "child": {
    "id": "products-grid-95",
    "type": "gridView",
    "props": {
      "crossAxisCount": 2,
      "mainAxisSpacing": 16,
      "crossAxisSpacing": 16,
      "childAspectRatio": 0.75,
      "enableInnerScroll": false,
      "requestKey": "product-list",
      "requestUrl": "/api/v1/public/collections/coll_featured/products?page=0&size=20",
      "emptyMessage": "لا توجد منتجات",
      "errorMessage": "حدث خطأ"
    },
    "itemBuilder": {
      "type": "repeat",
      "source": "dataContext.requests.product-list.data",
      "item": {
        "id": "group-surface-94",
        "type": "container",
        "props": { "color": "#f6f8fc", "padding": { "top": 12, "bottom": 12, "left": 12, "right": 12 }, "borderRadius": 16, "shadow": "sm" },
        "child": {
          "id": "column-89",
          "type": "column",
          "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 10 },
          "children": [
            { "id": "image-90", "type": "image", "props": { "source": "network", "semanticsLabel": "صورة المنتج", "fit": "cover", "borderRadius": 16, "urlPath": "item.primaryImageUrl" } },
            { "id": "heading-91", "type": "text", "props": { "fontSize": 16, "fontWeight": "semibold", "textAlign": "right", "color": "#14243f", "valuePath": "item.name" } },
            { "id": "text-92", "type": "text", "props": { "fontSize": 14, "textAlign": "right", "fontWeight": "semibold", "color": "#0b78c5", "valuePath": "item.price" } },
            {
              "id": "button-93",
              "type": "button",
              "props": { "label": "إضافة إلى السلة", "variant": "elevated", "height": 36 },
              "tap": { "type": "cubitCall", "cubit": "cart", "method": "addItem" }
            }
          ]
        }
      }
    }
  }
}
```

Points worth noting:

- `columnsMobile: 2` wins over `columns: 3` — mobile always reads the mobile column count.
- The Section's padding / background still wrap the grid; only the children wrapper is replaced.
- Bound children lose their static `value` / `url` and gain `valuePath` / `urlPath` on `item.*`
  ([§ 9.5](#95-valuecontext-binding-group--content-blocks)). The **static `semanticsLabel` stays** —
  `altValueContext` is dropped, because `semanticsLabelPath` is not an engine prop.
- The button label stays static. There is no `labelPath` on `button`.
- `collection.id` builds the `requestUrl`; `size` is capped at 20.

---

## 15. Worked Example B — Two-Page Content Site, Custom Theme

A content site — no catalog, no cart — on a theme that departs from the defaults on **every axis the
converter reads**: a serif Arabic face, a warm plum/clay palette, wider radii, a custom spacing scale
and taller buttons. Available as the second preset in the converter playground
(`lib/transformer.ts` → `EXAMPLE_PRESETS[1]`). It converts with **zero warnings**.

Where [§ 14](#14-worked-example-a--three-page-commerce-site-json) exercises commerce binding, this one
exercises **theming, the drawer zone, and the two ways to build a grid**.

### Page roles


| Page     | Route (in) | Route (out) | What it exercises |
| -------- | ---------- | ----------- | ----------------- |
| About us | `/`        | `/home`     | A title `Section`, then a **grid `Section`** (`columns: 2` / `columnsMobile: 1`) whose cells are `Group` blocks stacking a title over a description, then a `ContentButton` linking to `/login` |
| Login    | `/login`   | `/login`    | `phone` + `password` `ContentInput` + a `login` `ContentButton` ⇒ `form` + `cubitCall auth.login`, on the `layout: "centered"` shell |


One `ZoneDrawer` in `zones` (`side: "right"`) becomes the `appDrawer` on **both** pages.

Two pages means a **two-tab bar** — this is the clearest case for why the tab list is derived from
`pages[]` rather than fixed ([§ 7.3](#73-tabs-are-derived-from-the-pages)). A content site has no
`/categories`, `/search`, `/cart` or `/profile`, so a fixed five-tab bar would leave four tabs
navigating nowhere:

```json
"navigation": {
  "type": "tabs",
  "initialRoute": "/splash",
  "shellExcludeRoutes": ["/splash", "/splash-carousel", "/auth/login", "…", "/orders"],
  "tabs": [
    { "id": "tab-home", "label": "الرئيسية", "icon": "home", "route": "/home" },
    { "id": "tab-login", "label": "تسجيل الدخول", "icon": "person", "route": "/login" }
  ]
}
```

Neither page route is shell-excluded — both are tab roots. The list keeps only the engine's own
routes, `/auth/login` among them, which is a different route from this site's `/login` page.

### 15.1 Theme — what the root props actually move

**Web input (`root.props`):**

```json
{
  "title": "دار الحرفة", "direction": "rtl", "language": "ar",

  "bodyFont": "amiri",
  "fontOption1": "el-messiri",
  "fontOption2": "noto-naskh-arabic",

  "primary": "#7c3f5d", "surface": "#faf3ee", "text": "#2f2320", "neutral": "#8a7268",
  "success": "#4f7a4a", "warning": "#b8802a", "error": "#a3423a", "dark": "#2a1c22",

  "radiusSm": "10px", "radiusMd": "18px", "radiusLg": "28px", "radiusXl": "36px",

  "spacingSideNarrow": "14px", "spacingSideMedium": "20px", "spacingSideWide": "40px",
  "spacingVerticalNarrow": "32px", "spacingVerticalMedium": "56px", "spacingVerticalWide": "96px",

  "buttonSmHeight": "40px", "buttonMdHeight": "52px", "buttonLgHeight": "60px",

  "breakpointMobileMax": 767, "breakpointTabletMax": 1023
}
```

**Mobile output (`theme`):**

```json
{
  "mode": "light",
  "colors": {
    "primary": "#7c3f5d",
    "surface": "#faf3ee",
    "background": "#F1F5F9",
    "text": "#2f2320",
    "muted": "#8a7268",
    "success": "#4f7a4a",
    "warning": "#b8802a",
    "error": "#a3423a"
  },
  "typography": {
    "fontFamily": "Amiri",
    "scale": { "xs": 12, "sm": 14, "md": 16, "lg": 18, "xl": 22, "xxl": 28, "display": 36 },
    "weights": { "normal": 400, "medium": 500, "bold": 700 },
    "lineHeight": { "tight": 1.25, "normal": 1.5, "relaxed": 1.75 }
  },
  "radius": { "none": 0, "sm": 10, "md": 18, "lg": 28, "xl": 36, "full": 9999 },
  "spacing": { "xs": 4, "sm": 14, "md": 20, "lg": 40, "xl": 56 },
  "buttons": {
    "sm": { "height": 40, "padX": 14, "fontSize": 14, "radius": 10 },
    "md": { "height": 52, "padX": 18, "fontSize": 16, "radius": 12 },
    "lg": { "height": 60, "padX": 26, "fontSize": 16, "radius": 14 }
  }
}
```

What moved, and what did not:


| Root prop group             | Effect                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `bodyFont: "amiri"`         | `typography.fontFamily: "Amiri"` — a serif Arabic naskh ([§ 8](#bodyfont--themetypographyfontfamily))          |
| `primary` … `error`         | `colors.*` verbatim, **and** every `theme-*` colour token in a block resolves against them                     |
| `radiusSm` … `radiusXl`     | `radius.*` verbatim. **Does not reach the nodes** — see the caveat below                                       |
| `spacingSide*` / `spacingVerticalMedium` | `spacing.sm/md/lg/xl` ([§ 8](#theme-spacing-themespacing))                                        |
| `buttonSmHeight` … `buttonLgHeight` | `buttons.*.height` verbatim. **Does not reach the nodes** — see the caveat below                       |
| `background`                | Always `"#F1F5F9"` — not derived from `surface`                                                                |
| `fontOption1` / `fontOption2` | **Not emitted** — the engine theme carries one family                                                        |
| `dark`                      | **Not emitted** — `theme.colors` has no `dark` slot; the token still resolves inside blocks                    |
| `spacingVerticalNarrow` / `Wide` | **Not emitted** — vertical rhythm reaches output as concrete `Section` padding                            |
| `breakpoint*`               | **Not emitted** — breakpoints are a web-layout concern; `layout.hideOnMobile` is applied at conversion time    |


> ### ⚠️ Caveat — `theme.radius` and `theme.buttons` are reference-only
>
> `theme.radius.md` is `18` here, but a block asking for `borderRadius: "theme-md"` still emits `16`,
> and a `buttonVariantSize: "lg"` button still emits `height: 56` rather than the theme's `60`. Both
> per-node resolvers use fixed internal scales and never read these root props — the same class of gap
> as the [§ 5 radius deviation](#5-token-resolution-tables).
>
> **Renderers must treat the number on the node as authoritative** and not re-derive it from `theme`.
> The theme block is a palette for hand-authored JSON and engine-side defaults.

### 15.2 Home — title Section, then a grid Section

**Section 1 — the title.** Note the heading picks up `theme-primary` as the new plum, and
`level: "1"` drives `fontSize: 28`:

```json
{
  "id": "section-container-6",
  "type": "container",
  "props": { "color": "#faf3ee", "padding": { "top": 56, "bottom": 20, "left": 20, "right": 20 } },
  "child": {
    "id": "section-column-4",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [
      { "id": "heading-1", "type": "text", "props": { "value": "من نحن", "fontSize": 28, "fontWeight": "bold", "textAlign": "right", "color": "#7c3f5d" } },
      { "id": "text-2", "type": "text", "props": { "value": "ورشة عائلية تصنع الأثاث الخشبي يدويًا منذ عام ١٩٧٨.", "fontSize": 16, "textAlign": "right", "fontWeight": "normal", "color": "#8a7268" } },
      { "id": "divider-3", "type": "divider", "props": { "thickness": 1, "color": "#8a7268" } }
    ]
  }
}
```

**Section 2 — the grid.** The `Section` is the grid container, not a `Grid` block:

```json
{
  "type": "Section",
  "props": {
    "name": "بطاقات من نحن", "visible": true,
    "paddingTop": "0px", "paddingBottom": "20px", "paddingHorizontal": "20px",
    "backgroundColor": "#faf3ee", "maxWidth": "1280px",
    "columns": 2, "columnsMobile": 1, "gridGap": "20px",
    "content": [
      {
        "type": "Group",
        "props": {
          "direction": "column", "gap": 8, "alignItems": "stretch", "wrap": "nowrap",
          "backgroundColor": "theme-surface", "padding": "20px", "borderRadius": "theme-md", "boxShadow": "sm",
          "content": [
            { "type": "ContentHeading", "props": { "text": "قصتنا", "level": "2", "textAlign": "right", "fontSize": "theme-lg", "fontWeight": "theme-semibold", "color": "theme-text" } },
            { "type": "ContentParagraph", "props": { "text": "بدأت الورشة بغرفة صغيرة وأربع أدوات…", "textAlign": "right", "fontSize": "theme-md", "fontWeight": "theme-light", "lineHeight": "theme-relaxed", "color": "theme-neutral" } }
          ]
        }
      }
    ]
  }
}
```

**Mobile output** — `columnsMobile: 1`, so the grid collapses to a plain `column` and each cell takes
the full width at its natural height:

```json
{
  "id": "section-container-21",
  "type": "container",
  "props": { "color": "#faf3ee", "padding": { "top": 0, "bottom": 20, "left": 20, "right": 20 } },
  "child": {
    "id": "section-column-20",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [
      {
        "id": "group-surface-10",
        "type": "container",
        "props": { "color": "#faf3ee", "padding": { "top": 20, "bottom": 20, "left": 20, "right": 20 }, "borderRadius": 16, "shadow": "sm" },
        "child": {
          "id": "column-7",
          "type": "column",
          "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 8 },
          "children": [
            { "id": "heading-8", "type": "text", "props": { "value": "قصتنا", "fontSize": 18, "fontWeight": "semibold", "textAlign": "right", "color": "#2f2320" } },
            { "id": "text-9", "type": "text", "props": { "value": "بدأت الورشة بغرفة صغيرة وأربع أدوات…", "fontSize": 16, "textAlign": "right", "fontWeight": "normal", "color": "#8a7268" } }
          ]
        }
      }
    ]
  }
}
```

> ### Two ways to build a grid — pick the Section
>
> | | `Section` `columnsMobile` | `Grid` block ([§ 6.19](#619-grid-layout)) |
> | --- | --- | --- |
> | Output at 1 column | `column` | `gridView` `crossAxisCount: 1` |
> | Cell height | **Natural** — content decides | **Square** — `childAspectRatio: 1.0` is hard-coded |
> | Responsive | `columns` (wide) vs `columnsMobile` | One fixed `numColumns` |
>
> For variable-height content — text cards, feature lists, anything with a title and a paragraph —
> use the **`Section`**. A `Grid` block at `numColumns: 1` forces every cell to a square as tall as
> the viewport is wide, which is almost never what the design wants. Reserve `Grid` for uniform,
> genuinely square-ish tiles.

**Section 3 — the CTA.** A plain link to the login route:

```json
{
  "id": "button-22",
  "type": "button",
  "props": { "label": "تسجيل الدخول", "variant": "elevated", "height": 56 },
  "tap": { "type": "navigate", "route": "/login", "navigation_type": "push" }
}
```

### 15.3 The drawer zone

`ZoneDrawer` with `side: "right"` ⇒ `drawerEdge: "end"`, applied to **both** pages, and each page's
`appBar` gains `showMenu: true` + `menuAction: { "type": "openDrawer" }` even though there is no
`SiteHeader` anywhere in the payload.

```json
{
  "id": "drawer-30",
  "type": "appDrawer",
  "props": { "drawerEdge": "end", "width": 320, "backgroundColor": "#faf3ee" },
  "child": {
    "id": "drawer-col-31",
    "type": "column",
    "props": { "gap": 0 },
    "children": [
      { "id": "heading-26", "type": "text", "props": { "value": "دار الحرفة", "fontSize": 18, "fontWeight": "bold", "textAlign": "right", "color": "#7c3f5d" } },
      { "id": "divider-27", "type": "divider", "props": { "thickness": 1, "color": "#8a7268" } },
      { "id": "link-28", "type": "button", "props": { "label": "من نحن", "variant": "text", "color": "#2f2320" }, "tap": { "type": "navigate", "route": "/home", "navigation_type": "push" } },
      { "id": "link-29", "type": "button", "props": { "label": "تسجيل الدخول", "variant": "text", "color": "#7c3f5d" }, "tap": { "type": "navigate", "route": "/login", "navigation_type": "push" } }
    ]
  }
}
```

`width: 320` is a fixed converter default — `ZoneDrawer` has no width prop. The drawer's
`ContentLink` blocks carry `icon: "none"` deliberately: any other icon is dropped with a warning,
because the engine `button` has no icon prop.

### 15.4 Login — two inputs

Same machinery as [§ 14.2](#142-login--form--cubitcall-authlogin), minus the "remember me" switch.
The theme changes; the auth contract does not. The credential is still `phone` / `inputType: "tel"`,
and the page is still `layout: "centered"` — both are engine requirements, not styling choices
([§ 7.1](#71-auth-and-splash-pages-use-layout-centered-not-scroll-none),
[§ 7.2](#72-authlogin-binds-phone--never-email)).

```json
{
  "id": "button-35",
  "type": "button",
  "props": { "label": "دخول", "variant": "elevated", "height": 56 },
  "tap": {
    "type": "cubitCall",
    "cubit": "auth",
    "method": "login",
    "requireValidForm": true,
    "formId": "login-form",
    "params": {
      "phone": { "source": "form", "field": "phone" },
      "password": { "source": "form", "field": "password" }
    },
    "onSuccess": { "type": "navigate", "route": "/home", "navigation_type": "go" }
  }
}
```

Both fields get `textDirection: "ltr"`; `phone` additionally gets `keyboardType: "phone"` +
`validatePhone`, and `password` gets `obscureText: true`.

> **This example used to be wrong.** It shipped an `email` credential and a bare `scroll: "none"`
> page, which converts cleanly and renders a login screen that cannot log in and overflows on a
> short viewport. Params are built from whatever fields the Section contains, so the converter will
> happily emit a dead param — it now warns instead of staying silent. If you are copying an older
> revision of this section, re-read [§ 7.1](#71-auth-and-splash-pages-use-layout-centered-not-scroll-none)
> and [§ 7.2](#72-authlogin-binds-phone--never-email) first.

---

*Source: `lib/transformer.ts` — last updated 2026-08-07. Web input source of truth: `docs/BLOCKS-MOBILE.md`. Earlier revisions per mobile team reviews (`CONVERTER-SPEC-REVIEW-2026-07-01.md`, `CONVERTER-SPEC-REVIEW-2026-07-03 (1).md`, `CONVERTER-SPEC-REVIEW-2026-07-05.md`). Report mismatches with: block type name, web input sample, what the converter currently emits, and what your renderer expects.*