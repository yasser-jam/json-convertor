# Builder spec: [Short title]

> **Phase:** [e.g. 2 — Request loading contract]  
> **Status:** `draft` | `ready-for-builder` | `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** YYYY-MM-DD  

---

## Summary

One paragraph: what the mobile engine now supports (or will support) that the website builder must be able to author in JSON.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| e.g. `props.emptyMessage` on `gridView` | No | `Select-String` / line refs |

---

## Builder requirements

What the website builder UI/schema must support.

### 1. [Feature name]

**Applies to:** `type` = `gridView` | `listView` | page | `theme` | …

**JSON shape (authoritative):**

```json
{
  "type": "gridView",
  "props": {
    "requestKey": "product-list",
    "emptyMessage": "لا توجد منتجات",
    "errorMessage": "تعذر تحميل المنتجات"
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `emptyMessage` | string | no | `"No items available"` | Shown when list data is empty |
| `errorMessage` | string | no | _(generic error)_ | Shown when request fails |

**Validation rules for builder:**

- `requestKey` must match `props.data.requestKey` on the same node (or documented exception).
- Messages should allow Arabic (RTL) text.

**Pages to wire first (suggested):**

| Route | Node id (if any) | Notes |
|-------|------------------|-------|
| `/home` | | product grid |
| `/search` | | search results grid |

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Renderer | `lib/engine/tree/renderers/...` | … |
| Orchestration | `lib/features/variantscreen/...` | … |

No Dart changes required on builder side — this section is informational.

---

## Example: before / after

**Before (current prod):**

```json
{
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "enableInnerScroll": false
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
    "requestKey": "home-products",
    "emptyMessage": "لا توجد منتجات",
    "errorMessage": "تعذر التحميل"
  }
}
```

---

## Acceptance (builder done when)

- [ ] Builder can set listed fields per component type
- [ ] Exported `mobile_production_v2.json` includes fields on agreed routes
- [ ] Mobile app shows correct empty/error copy without code changes

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| YYYY-MM-DD | | Initial spec |
