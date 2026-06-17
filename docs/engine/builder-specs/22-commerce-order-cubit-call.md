# Builder spec: Commerce order cubitCall and tracking flow

> **Phase:** Commerce Phase 4  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-06-02  

---

## Summary

The mobile engine supports **`cubit: "order"`** cubitCall methods for **guest order lookup**, **authenticated my-orders list**, **order detail** (dual prefetch: detail + shipment track), **cancel**, and **invoice download**. Guest lookup uses **`CheckoutRepo.lookupGuestOrder`** (public API) orchestrated by `OrderCubit`. Shipment **404** renders a calm empty embed — not a global error toast.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `"cubit": "order"` | No | Orders pages use static cards / navigate only |
| `my-orders` `requestUrl` | No | `/orders` has hardcoded `#SOQ-7712` cards |
| `/orders/:orderId` page | No | Missing from `pages[]` |
| Dual `requestKey` on detail | No | No `order-detail` + `shipment-track` |
| Guest track form | No | No `/orders/track` route |
| Success page track CTAs | No | Only "العودة للرئيسية" |

---

## Builder requirements

### 1. Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/orders` | Authenticated order list | Bearer required |
| `/orders/:orderId` | Order detail + shipment embed | Public (guest after lookup) |
| `/orders/track` | Guest lookup form | Public |
| `/order/success` | Post-checkout CTAs | Public |

### 2. Order cubitCall methods

```json
"tap": {
  "type": "cubitCall",
  "cubit": "order",
  "method": "lookupGuest",
  "requireValidForm": true,
  "formId": "guest-order-track-form",
  "params": {
    "orderNumber": { "source": "form", "field": "orderNumber" },
    "email": { "source": "form", "field": "email" }
  },
  "onSuccess": {
    "type": "navigate",
    "route": "/orders/:orderId",
    "navigation_type": "push"
  }
}
```

| `method` | Purpose | Key params |
|----------|---------|------------|
| `lookupGuest` | `GET /public/checkout/orders/lookup` | `orderNumber`, `email` from form |
| `cancelOrder` | `POST /customer/orders/{orderId}/cancel` | `orderId` from `routeParams`; optional `reason` from form |
| `openInvoice` | `GET /customer/orders/{orderId}/invoice` → open PDF | `orderId` from `routeParams` |

**Failure handling:**

| Failure | UX |
|---------|-----|
| Guest lookup 404/400 | Inline `order.guestLookupError` — **no** `AppMessenger` |
| Cancel 400 | `AppMessenger` via `_OrderRequestHost` |
| Invoice error | `AppMessenger` |
| Shipment 404 | Empty embed on `requests.shipment-track` — **no** toast |

### 3. Prefetch requestUrl blocks

**My orders** (`/orders`):

```json
"data": {
  "requestKey": "my-orders",
  "requestUrl": "/api/v1/customer/orders?page=0&size=20"
}
```

**Order detail** (`/orders/:orderId`) — **two** data blocks:

```json
{ "requestKey": "order-detail", "requestUrl": "/api/v1/customer/orders/:orderId" }
{ "requestKey": "shipment-track", "requestUrl": "/api/v1/public/shipping/track/:orderId" }
```

**List binding:**

```json
"itemBuilder": {
  "type": "repeat",
  "source": "dataContext.requests.my-orders.data",
  "item": {
    "tap": { "type": "navigate", "route": "/orders/:orderId" },
    "props": { "valuePath": "item.orderNumber" }
  }
}
```

**Shipment empty embed contract:**

```json
{
  "success": true,
  "data": null,
  "empty": true,
  "message": "لم تبدأ عملية الشحن بعد."
}
```

### 4. Success page CTAs (`/order/success`)

| Button | Behavior |
|--------|----------|
| Track (logged in) | `navigate` → `/orders/:orderId` with `checkout.lastOrder.orderId`, `requireAuth: true` |
| Track (guest) | `navigate` → `/orders/track` |
| My orders | `navigate` → `/orders`, `requireAuth: true` |

### 5. dataContext bindings

| valuePath | Content |
|-----------|---------|
| `checkout.lastOrder.orderNumber` | Success order number (Phase 3) |
| `checkout.lastOrder.orderId` | Navigate to detail |
| `order.guestLookupError` | Guest lookup inline error |
| `requests.my-orders.data` | Order list rows |
| `requests.order-detail.data` | Full order detail |
| `requests.shipment-track.data` | Shipment status or empty |

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Cubit | `lib/features/commerce/order/presentation/manager/order_cubit/` | List, detail, guest lookup, cancel, invoice, shipment |
| Repos | `order_repo_impl.dart`, `shipping_repo_impl.dart` | Customer Bearer + public shipment |
| Guest lookup | `CheckoutRepo.lookupGuestOrder` | Reused from Phase 3 |
| Mapper | `lib/engine/requests/request_mapper.dart` | `needsOrderCubit`, URL detection |
| Actions | `lib/engine/actions/action_dispatcher.dart` | `cubit: "order"` |
| Host | `VariantScreen` `_OrderRequestHost` | Toasts, loading overlay, request results |

---

## Example: orders list before / after

**Before:** static cards with `#SOQ-7712`.

**After:** dynamic `listView` + `my-orders` request + repeat on `requests.my-orders.data`.
