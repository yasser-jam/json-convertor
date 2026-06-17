# 02 — Config and JSON

## AI must know

- **Primary config:** `assets/config/mobile_production_v2.json` (~4700 lines, schemaVersion `1.0`).
- **Top-level keys:** `schemaVersion`, `app`, `theme`, `navigation`, `pages`.
- **Pages are not separate files** — one JSON file; `VariantRepository` selects by `pageRoute` or `id`.
- **Changing merchant UI** = edit JSON + hot restart; rarely need Dart unless new component type or binding.

## Top-level schema

```json
{
  "schemaVersion": "1.0",
  "app": {
    "name": "SOOQ Merchant Mobile",
    "bundleId": "com.sooq.merchant.mobile",
    "apiBaseUrl": "https://...",
    "tenantId": "uuid",
    "tenantSlug": "merchant-slug"
  },
  "theme": { "mode", "colors", "typography", "radius", "spacing", "buttons" },
  "navigation": {
    "type": "tabs",
    "initialRoute": "/splash",
    "shellExcludeRoutes": ["/splash", "/auth/login", "..."],
    "tabs": [{ "id", "label", "icon", "route" }]
  },
  "pages": [{ "id", "route", "title", "background", "scroll", "appBar?", "body": [] }]
}
```

Parsed by `MobileAppConfig.fromJson` in `lib/config/mobile_app_config.dart`.

### Theme runtime bridge

The `theme` object is parsed into `MobileThemeConfig` on `MobileAppConfig.theme`. At startup, `main.dart` builds `MaterialApp` `ThemeData` via `EngineTheme.toThemeData` (Tajawal via `google_fonts` when `typography.fontFamily` is `Tajawal`). Dynamic pages inject `EngineTheme` into renderer `dataContext` under `EngineTheme.contextKey` (`'_engineTheme'`) from `VariantScreen._buildRenderContext`. Renderers read theme defaults from that key when component props omit colors or sizes (e.g. `text` without `color`, `button` without `borderRadius`).

### Page `scroll`

Each page in `pages[]` may set `"scroll"`:

| Value | Behavior |
|-------|----------|
| `vertical` (default) | `VariantRepository` passes `pageScroll: vertical` on the synthetic scaffold root. `ScaffoldRenderer` wraps the page body in an outer `SingleChildScrollView` (min-height + load-more footer when applicable). |
| `none` | `pageScroll: none` — no outer page scroll. Nested `listView` / `gridView` must use inner scrolling (`enableInnerScroll: true`) if the page should scroll. |

The page field is mapped to scaffold `properties.pageScroll` (engine-only bridge; not a builder component prop). Production config uses `vertical` on all pages today.

## Page body nodes

Each node in `body[]`:

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable identifier |
| `type` | yes | Maps to `GenericComponentType` string |
| `props` | yes | Flat key/value; includes `semanticType` metadata |
| `style` | optional | padding, margin, colors → merged into properties |
| `tap` | optional | Action map — see [04-actions-and-requests.md](04-actions-and-requests.md) |
| `child` / `children` | optional | Tree structure |
| `itemBuilder` | optional | Repeat/list templates |

### Data blocks (in `props.data`)

```json
"data": {
  "source": "collection",
  "id": "all-products",
  "requestKey": "product-list",
  "requestUrl": "/api/v1/public/products?page=0&size=20",
  "page": 0,
  "size": 20
}
```

`EngineRequestMapper` reads `requestUrl` + `requestKey`. `VariantScreen` executes matching cubit loads.

### Dynamic field paths

- `valuePath`: `"item.name"` — text from list item
- `urlPath`: `"item.image"` — image URL from item
- Fallback `value` / `url` when path missing

### `icon` — supported `name` values

`props.name` maps to Material icons via `PropertyParsers.parseIconData`. Unknown names fall back to `Icons.circle`.

| `name` | Material icon |
|--------|----------------|
| `home` | `Icons.home` |
| `list` | `Icons.list` |
| `grid_view` | `Icons.grid_view` |
| `settings` | `Icons.settings` |
| `search` | `Icons.search` |
| `cart`, `shopping_cart` | `Icons.shopping_cart` |
| `shopping_bag` | `Icons.shopping_bag` |
| `favorite` | `Icons.favorite` |
| `person` | `Icons.person` |
| `account_circle` | `Icons.account_circle` |
| `visibility` | `Icons.visibility` |
| `visibility_off` | `Icons.visibility_off` |
| `mail` | `Icons.mail` |
| `lock` | `Icons.lock` |
| `phone` | `Icons.phone` |
| `chevron_right` | `Icons.chevron_right` |
| `credit_card` | `Icons.credit_card` |
| `payments` | `Icons.payments` |
| `check_circle` | `Icons.check_circle` |
| `error` | `Icons.error` |
| `error_outline` | `Icons.error_outline` |
| `local_offer` | `Icons.local_offer` |
| `local_shipping` | `Icons.local_shipping` |
| `inventory_2` | `Icons.inventory_2` |

Optional accessibility on images: `semanticsLabel`, `alt` — see [builder-spec 10-accessibility-props](../engine/builder-specs/10-accessibility-props.md).

### `divider`, `sizedBox`, and spacing

- **`divider`** — horizontal rule; `thickness`, `color`. Used rarely (e.g. form separators). Prefer theme-muted `color` from JSON.
- **`sizedBox`** — fixed blank spacing or child constraint; `width` / `height` props. See [builder-spec 19-sized-box-spacing](../engine/builder-specs/19-sized-box-spacing.md).

#### Spacing decision

| Intent | JSON pattern |
|--------|----------------|
| Same gap between **all** siblings | `gap` on parent `row` / `column` (inserts `SizedBox` between every adjacent child) |
| Push content to opposite ends | `mainAxisAlignment: "spaceBetween"` on `row`/`column`, or `container` with `expand: true` |
| One fixed blank area | **`sizedBox`** with explicit `height` / `width` |
| Different gaps between pairs | Nested sub-`row`/`column` with different `gap`, or `container.margin` on specific children |

**Uniform `gap` limitation:** parent `gap` applies the same spacing between every sibling — there is no per-child `skipGap` or `gapBefore`. It never adds space before the first or after the last child.

**Removed `spacer` type:** no longer a registered component. Stale JSON with `"type": "spacer"` fails at parse time with `Unsupported component type`. Use the patterns above instead.

## Navigation rules

- **Tab routes** — shown in `TabShellWidget` bottom nav.
- **shellExcludeRoutes** — full-screen routes without tab bar (auth, splash, checkout, `/product/details/:productId`).
- **Dynamic segments** — `:productId`, `:categorySlug` in route strings; params passed to `VariantScreen.routeParams`.

## Config Dart models

| File | Model |
|------|-------|
| `component_config.dart` | `ComponentConfig` |
| `screen_config.dart` | `ScreenConfig` |
| `mobile_app_config.dart` | `MobileAppConfig` |
| `models/mobile_theme_config.dart` | `MobileThemeConfig` (JSON `theme`) |
| `navigation_config.dart` | `NavigationConfig`, tabs |
| `app_config.dart` | Legacy — prefer `MobileAppConfig` |

## Asset files

| File | Status |
|------|--------|
| `mobile_production_v2.json` | **Active** (main.dart) |
| `mobile_production.json` | Older variant |
| `mobile_component.json` | Component experiments |
| `mobile_component_flow_demo.json` | Demo flows |

## Switching config variant

Change in `lib/main.dart`:

```dart
const _kActiveConfig = 'mobile_production_v2';
```

Loads `assets/config/mobile_production_v2.json` via `AppConfigLoader`.

## Legacy: simple screen JSON

Still supported by `AssetVariantRepository` for standalone files:

```json
{ "id": "page-id", "pageName": "Name", "root": { "type": "scaffold", "child": { ... } } }
```

Production uses **builder format** inside `pages[]`, not separate per-page asset files.

## Anti-patterns

- Adding new screens only in Dart (`MaterialPageRoute` to custom widgets) for merchant flows
- Nesting objects inside `props` (except documented `data`, `tap`)
- Hardcoding API URLs in renderers instead of JSON `requestUrl`

## Related

- [04-actions-and-requests.md](04-actions-and-requests.md)
- [03-engine.md](03-engine.md)
