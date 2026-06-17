# Builder spec: List/grid request loading, empty, and error UI

> **Phase:** 2 — Request loading / empty / error contract  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-20  

---

## Summary

The mobile engine shows **loading**, **error**, and **empty** placeholders on `listView` and `gridView` when bound to an API `requestKey`. Copy is driven by optional `emptyMessage` and `errorMessage` props. **Phase 7** wired Arabic messages on all eight catalog list/grid nodes in `mobile_production_v2.json`. The website builder should still support authoring these fields for new exports.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `props.data.requestKey` on catalog list/grid | Yes | e.g. L831 `home-categories`, L931 `home-featured-products`, L1087 `category-tree`, L1244 `product-list` |
| Top-level `props.requestKey` | No | Engine accepts either; prod uses `data.requestKey` only |
| `props.emptyMessage` | Yes | 8 catalog list/grid nodes (Phase 7) |
| `props.errorMessage` | Yes | 8 catalog list/grid nodes (Phase 7) |

---

## Builder requirements

### 1. Request-bound list/grid UI

**Applies to:** `type` = `gridView` | `listView`

**JSON shape (authoritative):**

```json
{
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "enableInnerScroll": false,
    "data": {
      "source": "collection",
      "id": "featured-home",
      "requestKey": "home-featured-products",
      "requestUrl": "/api/v1/public/products?page=0&size=6"
    },
    "emptyMessage": "لا توجد منتجات",
    "errorMessage": "تعذر تحميل المنتجات"
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.home-featured-products.data",
    "item": { }
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `data.requestKey` | string | yes (for API lists) | — | Must match `EngineRequestMapper` key and `itemBuilder.source` path |
| `requestKey` | string | no | — | Optional alias at `props` root; engine prefers this over `data.requestKey` if both set |
| `emptyMessage` | string | no | `"No items available"` | Shown when request succeeded and list data is empty |
| `errorMessage` | string | no | `"Unable to load content"` | Shown when `requests.{key}.success == false`; falls back to API `message` |

**Validation rules for builder:**

- `data.requestKey` (or `requestKey`) must match the key segment in `itemBuilder.source` (e.g. `dataContext.requests.home-featured-products.data`).
- `emptyMessage` / `errorMessage` should support Arabic (RTL) text.
- Do not rely on a page-level spinner for catalog grids; the component shows its own loading state.

**Pages to wire first (Phase 7):**

| Route | Notes |
|-------|-------|
| `/home` | Category grid (`home-categories`), featured products (`home-featured-products`) |
| `/search` | Autocomplete list, search results grid |
| Category / product listing routes | `category-products`, `product-list`, etc. |

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Contract helper | `lib/engine/request_ui_state.dart` | Resolves phase: loading / error / empty / ready |
| Orchestration | `lib/features/variantscreen/presentation/views/variant_screen.dart` | Sets `dataContext.loadingRequestKeys`, `requests.{key}` |
| Renderers | `lib/engine/tree/renderers/list_view_renderer.dart`, `grid_view_renderer.dart` | Placeholder vs list/grid from phase |

**Runtime `dataContext` (orchestration only — not authored in JSON):**

| Key | Meaning |
|-----|---------|
| `requests.{requestKey}` | API result map (`success`, `message`, `data`, …) |
| `loadingRequestKeys.{key}` | Initial load in progress |

---

## Example: before / after

**Before (current prod):**

```json
{
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "enableInnerScroll": false,
    "data": {
      "requestKey": "home-featured-products",
      "requestUrl": "/api/v1/public/products?page=0&size=6"
    }
  }
}
```

**After (target):**

```json
{
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "enableInnerScroll": false,
    "data": {
      "requestKey": "home-featured-products",
      "requestUrl": "/api/v1/public/products?page=0&size=6"
    },
    "emptyMessage": "لا توجد منتجات",
    "errorMessage": "تعذر تحميل المنتجات"
  }
}
```

---

## Acceptance (builder done when)

- [ ] Builder can set `emptyMessage` and `errorMessage` on `listView` and `gridView`
- [ ] Builder continues to set `data.requestKey` aligned with `itemBuilder.source`
- [x] Exported `mobile_production_v2.json` includes messages on agreed catalog routes (Phase 7)
- [ ] Mobile app shows correct empty/error copy without code changes

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-20 | Engine Phase 2 | Initial spec; engine implemented, prod JSON unchanged |
| 2026-05-21 | Engine Phase 7 | Arabic `emptyMessage` / `errorMessage` on 8 catalog list/grid nodes in prod JSON |
