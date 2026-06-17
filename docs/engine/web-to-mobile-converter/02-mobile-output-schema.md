# 02 — Mobile Output Schema

Full **`MobileAppConfig`** envelope required for production. Parsed by `MobileAppConfig.fromJson` (`lib/config/mobile_app_config.dart`).

Reference: [docs/ai/02-config-and-json.md](../../ai/02-config-and-json.md), [assets/config/mobile_production_v2.json](../../../assets/config/mobile_production_v2.json).

---

## Top-level envelope

```json
{
  "schemaVersion": "1.0",
  "app": { },
  "theme": { },
  "navigation": { },
  "pages": [ ]
}
```

| Key | Required | Source in conversion |
|-----|----------|---------------------|
| `schemaVersion` | yes | Always `"1.0"` |
| `app` | yes | Tenant/deployment config (not from web blocks) + optional merge from deployment |
| `theme` | yes | [04-theme-and-root-mapping.md](04-theme-and-root-mapping.md) |
| `navigation` | yes | [05-navigation-and-routes.md](05-navigation-and-routes.md) |
| `pages` | yes | One entry per converted web page |

### `app` object

```json
{
  "name": "SOOQ Merchant Mobile",
  "bundleId": "com.sooq.merchant.mobile",
  "apiBaseUrl": "https://sooq.up.railway.app",
  "tenantId": "uuid",
  "tenantSlug": "merchant-slug",
  "supportWhatsApp": "963...",
  "supportPhone": "963..."
}
```

**Rule:** Converter must accept `app` as **injectable defaults** (from deployment manifest). Web `root.props` does not contain tenant UUID — never invent `tenantId`.

---

## `theme` object

```json
{
  "mode": "light",
  "colors": {
    "primary": "#1D4ED8",
    "surface": "#F8FAFC",
    "background": "#F1F5F9",
    "text": "#0F172A",
    "muted": "#475569",
    "success": "#16A34A",
    "warning": "#D97706",
    "error": "#DC2626"
  },
  "typography": {
    "fontFamily": "Tajawal",
    "scale": { "xs": 12, "sm": 13, "md": 16, "lg": 18, "xl": 22, "xxl": 28, "display": 36 },
    "weights": { "normal": 400, "medium": 500, "bold": 700 },
    "lineHeight": { "tight": 1.25, "normal": 1.5, "relaxed": 1.75 }
  },
  "radius": { "none": 0, "sm": 6, "md": 10, "lg": 14, "xl": 20, "full": 9999 },
  "spacing": { "xs": 4, "sm": 10, "md": 16, "lg": 24, "xl": 36 },
  "buttons": {
    "sm": { "height": 36, "padX": 14, "fontSize": 14, "radius": 10 },
    "md": { "height": 48, "padX": 18, "fontSize": 16, "radius": 12 },
    "lg": { "height": 56, "padX": 26, "fontSize": 16, "radius": 14 }
  }
}
```

Mapping from web: [04-theme-and-root-mapping.md](04-theme-and-root-mapping.md).

---

## `navigation` object

```json
{
  "type": "tabs",
  "initialRoute": "/splash",
  "shellExcludeRoutes": ["/splash", "/auth/login", "..."],
  "tabs": [
    { "id": "tab-home", "label": "الرئيسية", "icon": "home", "route": "/home" }
  ]
}
```

Assembly rules: [05-navigation-and-routes.md](05-navigation-and-routes.md).

**Note:** Web storefront has no bottom tab bar. Mobile converter **adds** tab shell from defaults + header links unless overridden.

---

## `pages[]` entry

```json
{
  "id": "page-home",
  "route": "/home",
  "title": "Home",
  "background": "#FFFFFF",
  "scroll": "vertical",
  "layout": "centered",
  "appBar": { "id": "...", "type": "appBar", "props": { } },
  "body": [ ]
}
```

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `id` | yes | `page-{slug}` | Stable slug from route |
| `route` | yes | — | Mobile route string |
| `title` | yes | web `label` | AppBar title source |
| `background` | no | `#FFFFFF` | Scaffold background |
| `scroll` | no | `vertical` | `vertical` \| `none` — [03-global-engine-rules.md](03-global-engine-rules.md) |
| `layout` | no | omit | `"centered"` for splash-style only |
| `appBar` | no | omit | From SiteHeader — [blocks/13-shell-blocks.md](blocks/13-shell-blocks.md) |
| `body` | yes | `[]` | Array of mobile component nodes |

---

## Component node shape

```json
{
  "id": "products-grid",
  "type": "gridView",
  "props": { },
  "style": { },
  "tap": { },
  "child": { },
  "children": [ ],
  "itemBuilder": { }
}
```

| Field | Rule |
|-------|------|
| `id` | Required; unique within page |
| `type` | Required; must be valid `GenericComponentType` |
| `props` | Required object (may be `{}`) |
| `style` | Optional; padding, margin, color — merged into renderer props |
| `tap` | Optional; node-level actions only |
| `child` / `children` | **Mutually exclusive** |
| `itemBuilder` | For `listView` / `gridView` repeat templates |

### `props.data` (collections)

```json
"data": {
  "source": "collection",
  "id": "products-grid",
  "requestKey": "product-list",
  "requestUrl": "/api/v1/public/products?page=0&size=20",
  "page": 0,
  "size": 20
}
```

### `itemBuilder.repeat`

```json
"itemBuilder": {
  "type": "repeat",
  "source": "dataContext.requests.product-list.data",
  "item": { "id": "...", "type": "card", "props": { }, "child": { } }
}
```

---

## Synthetic scaffold (engine-only)

`VariantRepository` wraps each page at runtime:

```
scaffold (pageScroll from pages[].scroll)
  └── column (crossAxis: stretch, safeAreaBody)
        ├── appBar? (optional node from pages[].appBar)
        └── body[] nodes
```

**Do not** author top-level `type: scaffold` inside `pages[].body[]`. Page scroll is **`pages[].scroll`**, not a `singleChildScrollView` wrapper in body (unless legacy pattern explicitly needed).

---

## Minimal full-config example

See [fixtures/01-page-shell.mobile.json](fixtures/01-page-shell.mobile.json).
