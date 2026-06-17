# Builder spec: Commerce cart cubitCall and cart data binding

> **Phase:** Commerce Phase 1  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-31  

---

## Summary

The mobile engine will support **`tap.type: cubitCall`** with **`cubit: "cart"`** to mutate the local persisted shopping cart, and **`itemBuilder.repeat`** bound to **`cart.items`** in `dataContext`. Production JSON currently uses static cart placeholders and navigate-only product CTAs — the builder must author the dynamic cart contract below.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `"cubit": "cart"` | No | Only `"cubit": "auth"` (login, logout, OTP) |
| `cart.items` repeat source | No | Static `cart-item-1`, `cart-item-2` cards on `/cart` |
| Product add-to-cart `cubitCall` | No | `product-add-cart` uses `navigate` only |
| Variant picker before add | No | No `dropdown` / variant field on product detail |

```powershell
Select-String -Path assets\config\mobile_production_v2.json -Pattern '"cubit":\s*"cart"'
Select-String -Path assets\config\mobile_production_v2.json -Pattern 'cart\.items'
```

---

## Builder requirements

### 1. Cart cubitCall actions

**Applies to:** any node `tap` (typically `button`, `card`)

**JSON shape:**

```json
"tap": {
  "type": "cubitCall",
  "cubit": "cart",
  "method": "addItem",
  "params": {
    "variantId": { "source": "form", "field": "selectedVariantId" },
    "quantity": { "value": 1 },
    "productTitle": { "source": "dataContext", "field": "requests.product-detail.data.name" },
    "unitPrice": { "source": "item", "field": "unitPrice" },
    "variantTitle": { "source": "form", "field": "selectedVariantLabel" },
    "thumbnailUrl": { "source": "dataContext", "field": "requests.product-detail.data.primaryImageUrl" }
  },
  "onSuccess": {
    "type": "navigate",
    "route": "/cart",
    "navigation_type": "push"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Must be `cubitCall` |
| `cubit` | string | yes | Must be `cart` |
| `method` | string | yes | See methods table below |
| `params` | object | method-dependent | Param specs — see resolution table |
| `onSuccess` | action object | no | Nested tap (e.g. navigate, showMessage) |
| `onFailure` | action object | no | Nested tap on validation/repo failure |

**Cart methods:**

| `method` | Required params | Behavior |
|----------|-----------------|----------|
| `addItem` | `variantId`, `quantity`, `productTitle`, `unitPrice`; optional `variantTitle`, `thumbnailUrl` | Upsert line by `variantId`, persist locally |
| `updateQuantity` | `variantId`, `quantity` | Set qty ≥ 1; remove line if qty ≤ 0 |
| `removeItem` | `variantId` | Remove line |
| `clear` | — | Empty cart (post-checkout) |

**Param resolution (`params` values):**

| `source` | Resolves from |
|----------|---------------|
| `form` | `FormStateStore` field id (`field`) |
| `item` | Current `itemBuilder` repeat item (`field`) |
| `value` | Literal in `value` key |
| `routeParams` | `dataContext.routeParams[field]` |
| `app` | `dataContext.app[field]` |
| `dataContext` | Dotted path in `field` |

### 2. Variant selection gate (locked decision)

**Multi-variant products:** require explicit variant selection before `addItem`.

- Author a **`dropdown`** (or future bottom-sheet flow) on product detail bound to `FormStateStore` (`selectedVariantId`, `selectedVariantLabel`).
- Wire **Add to cart** with `requireValidForm: true` + `formId` when variants exist.
- **Do not** default to the first variant silently.

### 3. Dynamic cart list (`/cart`)

**Applies to:** `type` = `listView`

```json
{
  "type": "listView",
  "props": {
    "enableInnerScroll": false,
    "emptyMessage": "السلة فارغة",
    "itemBuilder": {
      "type": "repeat",
      "source": "cart.items",
      "item": {
        "type": "card",
        "child": {
          "type": "column",
          "children": [
            {
              "type": "text",
              "props": { "valuePath": "item.productTitle" }
            },
            {
              "type": "text",
              "props": { "valuePath": "item.unitPrice" }
            }
          ]
        }
      }
    }
  }
}
```

| Binding path | Content |
|--------------|---------|
| `cart.items` | Repeat source for line cards |
| `cart.itemCount` | Tab badge (future) |
| `cart.subtotalSyp` | Summary subtotal (integer SYP) |
| `cart.isEmpty` | Empty-state condition |

**valuePath fields on repeat `item`:** `productTitle`, `variantTitle`, `unitPrice`, `quantity`, `variantId`, `thumbnailUrl` (via `urlPath` on `image`).

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Actions | `lib/engine/actions/action_dispatcher.dart` | Dispatches `cubit: cart` (Phase 1) |
| Orchestration | `lib/features/variantscreen/presentation/views/variant_screen.dart` | Injects `cart.*` into `dataContext` |
| Cart state | `lib/features/commerce/cart/` | `CartCubit` + local persistence |

---

## Example: product detail add-to-cart

**Before (current prod):**

```json
"tap": {
  "type": "navigate",
  "route": "/cart",
  "navigation_type": "clear_stack"
}
```

**After (target):**

```json
"tap": {
  "type": "cubitCall",
  "cubit": "cart",
  "method": "addItem",
  "requireValidForm": true,
  "formId": "product-variant-form",
  "params": {
    "variantId": { "source": "form", "field": "selectedVariantId" },
    "quantity": { "value": 1 },
    "productTitle": { "source": "dataContext", "field": "requests.product-detail.data.name" },
    "unitPrice": { "source": "form", "field": "selectedVariantPrice" }
  },
  "onSuccess": {
    "type": "navigate",
    "route": "/cart",
    "navigation_type": "push"
  }
}
```

---

## Acceptance (builder done when)

- [ ] Builder can author `cubitCall` with `cubit: "cart"` and all four methods
- [ ] Product detail includes variant picker when `variants.length > 1`
- [ ] `/cart` uses `itemBuilder.repeat` on `cart.items` (no static line items)
- [ ] Exported JSON includes qty/remove `cubitCall` taps on cart lines

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-31 | | Initial spec — Phase 0 handoff |
