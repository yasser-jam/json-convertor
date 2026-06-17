# 03 — Engine

## AI must know

- **30 component types** — all mapped in `ScreenRenderer._createDefaultRenderers` (including `unsupported` fallback).
- **Entry:** `ScreenRenderer.withPrimitives().render(screenConfig, context:, dataContext:)`.
- **No domain logic** in renderers — only layout, styling, path resolution from `dataContext`.
- New component type = enum + renderer + schema + register in `screen_renderer.dart`.

## Component types (current)

| Type | Renderer file | Role |
|------|---------------|------|
| `scaffold` | `scaffold_renderer.dart` | Page shell |
| `singleChildScrollView` | `single_child_scroll_view_renderer.dart` | Scroll wrapper |
| `column` | `column_renderer.dart` | Vertical layout |
| `row` | `row_renderer.dart` | Horizontal layout |
| `container` | `container_renderer.dart` | Box + padding |
| `listView` | `list_view_renderer.dart` | Scrollable list |
| `gridView` | `grid_view_renderer.dart` | Grid + itemBuilder |
| `text` | `text_renderer.dart` | Text + valuePath |
| `textFormField` | `text_form_field_renderer.dart` | Form fields |
| `form` | `form_renderer.dart` | Form grouping |
| `button` | `button_renderer.dart` | Buttons (optional `icon` + label row) |
| `contactButton` | `contact_button_renderer.dart` | External contact CTAs (WhatsApp, tel, sms, …) |
| `card` | `card_renderer.dart` | Material card |
| `image` | `image_renderer.dart` | Network/asset images |
| `appBar` | `app_bar_renderer.dart` | Top bar |
| `divider` | `divider_renderer.dart` | Divider line |
| `sizedBox` | `sized_box_renderer.dart` | Fixed width/height gap |
| `icon` | `icon_renderer.dart` | Material icons |
| `richtext` | `rich_text_renderer.dart` | Rich text |
| `videoPlayer` | `video_player_renderer.dart` | Video embed |
| `stack` | `stack_renderer.dart` | Layered overlays |
| `imageSlider` | `image_slider_renderer.dart` | Full-screen carousel |
| `timer` | `timer_renderer.dart` | Delayed navigate |
| `progressIndicator` | `progress_indicator_renderer.dart` | Loading spinner |
| `appDrawer` | `app_drawer_renderer.dart` | Side drawer (registers page chrome) |
| `tabs` | `tabs_renderer.dart` | In-page segment tabs (not bottom shell) |
| `otpInput` | `otp_input_renderer.dart` | Multi-box OTP + `FormStateStore` |
| `dropdown` | `dropdown_renderer.dart` | Single-choice select (form + filters) |
| `expansionTile` | `expansion_tile_renderer.dart` | Collapsible FAQ / detail sections |
| `unsupported` | `unsupported_component_renderer.dart` | Unknown types |

Enum: `lib/core/enums/generic_component_type.dart`.

## semanticType vs type

- **`type`** — selects renderer (required).
- **`semanticType`** — documentation/metadata (e.g. `ProductList`, `Hero`); **does not** register a custom renderer. Complex commerce UIs are built from primitives (`gridView` + `itemBuilder` + `card`).

## Parsing pipeline

1. `AssetVariantRepository.load(variantId, pageRoute:)` reads `assets/config/{variantId}.json`.
2. Selects page from `pages[]` by `route` or `id`.
3. Normalizes builder nodes → `ComponentConfig` (merges `props` + `style`, maps axis names).
4. Validates structure (strict) + `ComponentSchemas` (lenient warnings).
5. Runs `LayoutConstraintValidator` on the synthetic scaffold (errors throw in debug; warnings logged).
6. Returns `ScreenConfig(pageId, pageName, root)`.

File: `lib/features/variantscreen/data/repos/variant_repository.dart`.

## Request-bound skeleton loading (engine default)

- **Scope:** `listView` / `gridView` / `container` when `RequestBoundListPhase.loading` (`loadingRequestKeys` or missing `requests.{key}` + `initialRequestKeys`).
- **List/grid:** fake row count from `props.data.size`, `requestUrl` `size=`, or grid/list heuristics; renders real `itemBuilder` trees under `Skeletonizer`.
- **Container (detail shells):** `product-detail`, `category-detail`, etc. — injects `SkeletonItemFactory.detailRequestContext` on the direct `child`, builds the real subtree, wraps with `RequestBoundSkeleton`; spinner only when loading with no `child`.
- **Not skeletonized:** error/empty placeholders (`buildRequestPhasePlaceholder`), load-more footer, page JSON load (`VariantLoading`).
- **Implementation:** `lib/engine/skeleton/` — `skeletonMode` on `dataContext` skips network images in `ImageRenderer`.
- **No JSON props** — merchants do not configure skeleton behavior in v1.

## ScreenRenderer behavior

- Recursive `_buildComponent` with debug path `_enginePath`.
- Injects `FormStateStore` and `EngineActionDispatcher` into `dataContext`.
- Resolves `tap` on non-button nodes via `GestureDetector`.
- `dataContextOverride` on nodes merges into child context.

## Property parsers

`lib/engine/tree/parsers/property_parsers.dart` — colors, padding, alignment, font sizes from dynamic JSON.

`lib/engine/tree/parsers/data_context_path.dart` — resolves dotted paths for repeat items.

## Validation

- `component_schema.dart` — per-type required/optional props
- `component_schemas.dart` — catalog aligned with `mobile_production_v2` (e.g. `valuePath`, `urlPath`, `gap`, `shadow`, `border`, `aspectRatio`, `variant`, `id`). Warns on unknown keys; does not block render. Button `onTap` is **runtime-injected** by `ScreenRenderer` from JSON `tap` — do not author `onTap` in JSON.
- `layout_constraint_validator.dart` — parse-time layout rules on every `AssetVariantRepository.loadVariant`; CI via `test/engine/validation/prod_layout_validator_test.dart` (0 errors on prod pages).

## `imageSlider` (PDP/gallery) notes

- Supports static `images` and dynamic binding via `imagesPath` + `itemUrlPath` / `itemAltPath`.
- Supports rounded media (`borderRadius`), fullscreen preview (`enableFullscreenPreview`), and thumbnail strip (`showThumbnails`).
- Single-image behavior is explicit and backward-compatible:
  - `showIndicatorsWhenSingle` (default `false`)
  - `showThumbnailsWhenSingle` (default `false`)
- If these single-image flags are omitted, old behavior remains (controls hidden for a one-image payload).

## Registry note

`ComponentRegistry` may exist historically; **production path uses enum map in `ScreenRenderer`**, not string registry.

## Adding a new component type

1. Add to `GenericComponentType` enum.
2. Create `lib/engine/tree/renderers/{name}_renderer.dart` implementing `ComponentRenderer`.
3. Register in `ScreenRenderer._createDefaultRenderers`.
4. Add schema in `component_schemas.dart`.
5. Document JSON shape in [09-workflows.md](09-workflows.md).
6. Add unit/widget test under `test/engine/`.

## Layout & constraints

- **Audit:** [LAYOUT_CONSTRAINT_AUDIT.md](../engine/LAYOUT_CONSTRAINT_AUDIT.md) — constraint flow, PASS/FAIL matrix, canonical JSON patterns.
- **Improvement plan:** [LAYOUT_IMPROVEMENT_PLAN.md](../engine/LAYOUT_IMPROVEMENT_PLAN.md) — how we reduce layout risk (presets, parse gates, safe renderers).
- **Parse-time validation:** `LayoutConstraintValidator` in `VariantRepository` (debug throws on errors) + secondary debug assert in `ScreenRenderer`.
- **Canonical patterns:**
  - **Splash / full-screen center:** `pages[].layout: "centered"` (engine forces `scroll: none`, root column max + stretch, injects `expand` if missing). See [15-page-layout-preset.md](../engine/builder-specs/15-page-layout-preset.md).
  - **Catalog:** `scroll: "vertical"` + `gridView`/`listView` with `enableInnerScroll: false` (outer page scroll only).
  - **Search toolbar:** `row` + `container` with `expand: true`, `expandAxis: "horizontal"`.
  - **Auth forms:** `scroll: "none"` on short static pages (validator whitelist).
- **Avoid:** nested `singleChildScrollView` (unwrapped at runtime); viewport centering under `scroll: vertical` without `expand` or `layout: centered`. Do not use removed `type: spacer` — use `gap`, `mainAxisAlignment`, or `sizedBox`.

## `dropdown` and `expansionTile` usage

### `dropdown`

| Context | JSON guidance |
|---------|----------------|
| **`row` filter / toolbar** | Hint-only (no `label`): engine uses compact `IntrinsicWidth` mode — safe in `row` without `container.expand`. Example: search sort on `/search`. |
| **`column` / `form`** | Use `label` + `"isExpanded": true` for full-width fields. Example: language picker on `/settings`. |
| **Height** | `isDense` defaults to `true`; tighten further with `padding` (`top`/`bottom` 4–8). |
| **Items** | Static: `data.items[]`. Dynamic: `itemsPath` + optional `itemLabelPath` / `itemValuePath`. |
| **Selection actions** | `tap` or `onChanged` — `dataContext['tap']` receives `{ value, index, label }`. |

Do **not** put a labeled dropdown in a `row` without an explicit `width` or parent flex — use hint-only compact mode for inline filters.

### `expansionTile`

| Topic | Behavior |
|-------|----------|
| **Dividers** | Off by default (`showDivider: false`). Internal Material dividers are suppressed in the renderer. Set `"showDivider": true` only when stacking tiles and you want a separator below each tile. |
| **Multiple open** | Each tile is independent; several may stay expanded. |
| **Appearance** | Use `borderRadius`, `backgroundColor`, `tilePadding`, `childrenPadding` — not sibling `divider` nodes unless you want a section break (e.g. product page keeps a separate `divider` above the description tile). |
| **Body** | `children[]` (or `child`) — rendered when expanded; `maintainState` defaults to `true`. |

## Related

- [04-actions-and-requests.md](04-actions-and-requests.md)
- [08-feature-variant-shell.md](08-feature-variant-shell.md)
