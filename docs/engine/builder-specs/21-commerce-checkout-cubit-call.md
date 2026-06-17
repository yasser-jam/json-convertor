# Builder spec: Commerce checkout cubitCall and wizard flow

> **Phase:** Commerce Phase 3  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-31  

---

## Summary

The mobile engine will support **`cubit: "checkout"`** cubitCall methods for the **multi-route checkout wizard** (`/checkout` → `/checkout/address` → `/checkout/payment`), session-persisted draft state via `CheckoutCubit`, and prefetch `data.requestUrl` blocks for payment methods and shipping quotes. GPS coordinates come from an **OpenStreetMap / `flutter_map`** picker (Phase 3 Dart integration) writing lat/lng into the checkout draft — not from JSON alone.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `"cubit": "checkout"` | No | Checkout buttons use `navigate` only |
| `checkout.saveAddress` / `placeOrder` | No | Address continue is navigate + `requireValidForm` only |
| Payment methods `requestUrl` | No | Static COD/card cards on `/checkout/payment` |
| `checkout.lastOrder.*` valuePath | No | Order success page uses static copy |
| GPS lat/lng capture | No | Address form has text fields only |

```powershell
Select-String -Path assets\config\mobile_production_v2.json -Pattern '"cubit":\s*"checkout"'
Select-String -Path assets\config\mobile_production_v2.json -Pattern 'payments/methods'
```

---

## Builder requirements

### 1. Multi-route wizard (locked decision)

Routes (all in `shellExcludeRoutes`):

| Route | Purpose |
|-------|---------|
| `/checkout` | Summary + step cards → address / payment |
| `/checkout/address` | Recipient form + map picker trigger + `saveAddress` |
| `/checkout/payment` | Payment method list + `placeOrder` |

Draft state persists in **`CheckoutCubit`** (session singleton) across pushes — do not rely on page-local form state alone for cross-step data.

### 2. Checkout cubitCall methods

**JSON shape:**

```json
"tap": {
  "type": "cubitCall",
  "cubit": "checkout",
  "method": "saveAddress",
  "requireValidForm": true,
  "formId": "checkout-address-form",
  "params": {
    "recipientName": { "source": "form", "field": "fullName" },
    "phone": { "source": "form", "field": "phone" },
    "addressLabel": { "source": "form", "field": "addressLine" },
    "guestEmail": { "source": "form", "field": "guestEmail" }
  },
  "onSuccess": {
    "type": "navigate",
    "route": "/checkout/payment",
    "navigation_type": "push"
  }
}
```

| `method` | Purpose | Key params |
|----------|---------|------------|
| `saveAddress` | Persist shipping address + trigger shipping quote | form fields; lat/lng from checkout draft (map picker) |
| `selectPaymentMethod` | Set `paymentMethod` provider code | `providerCode` from `item` or `value` |
| `validateDiscount` | Prefetch discount validation | `code`, optional `subtotal`, `shippingCost` |
| `placeOrder` | `POST /public/checkout` with idempotency token | reads cart + draft; optional `guestEmail` |

**Failure handling:** hard failures → `AppMessenger` via `_CheckoutRequestHost`; discount invalid → inline `requests.discount-validation.message`.

### 3. Prefetch requestUrl blocks

**Payment methods** on `/checkout/payment`:

```json
"props": {
  "data": {
    "requestKey": "payment-methods",
    "requestUrl": "/api/v1/public/payments/methods"
  }
}
```

**List binding:**

```json
"itemBuilder": {
  "type": "repeat",
  "source": "dataContext.requests.payment-methods.data",
  "item": { "type": "card", "props": { "valuePath": "item.displayName" } }
}
```

Filter **`requiresRedirect: true`** methods as disabled ("قريباً") — COD only until Paymera redirect URL is exposed (spec gap).

**Shipping cost** is fetched by cubit when GPS coords change — not typically a page-level `requestUrl` in JSON.

### 4. Place order and success binding

**Place order button** (`/checkout` or `/checkout/payment`):

```json
"tap": {
  "type": "cubitCall",
  "cubit": "checkout",
  "method": "placeOrder",
  "onSuccess": {
    "type": "navigate",
    "route": "/order/success",
    "navigation_type": "clear_stack"
  },
  "onFailure": {
    "type": "navigate",
    "route": "/order/failure",
    "navigation_type": "clear_stack"
  }
}
```

**Order success page** — bind dynamic copy:

| valuePath | Content |
|-----------|---------|
| `checkout.lastOrder.orderNumber` | Confirmed order number |
| `checkout.lastOrder.total` | Order total (integer SYP) |

### 5. GPS / map picker (Phase 3 engine note)

- Map: **OpenStreetMap** tiles via **`flutter_map`** (not Google Maps).
- Button on address page triggers cubit/map flow; resulting **`latitude`** / **`longitude`** stored in checkout draft.
- Free-text **`addressLabel`** remains a `textFormField` in JSON.

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Actions | `lib/engine/actions/action_dispatcher.dart` | `cubit: checkout` dispatch (Phase 3) |
| Requests | `lib/engine/requests/request_mapper.dart` | Payment methods URL routing (Phase 3) |
| Orchestration | `variant_screen.dart` | `_CheckoutRequestHost`, checkout draft in `dataContext` |
| Checkout | `lib/features/commerce/checkout/` | `CheckoutCubit`, `CheckoutRepo`, session store |

---

## Example: address continue (before / after)

**Before (current prod):**

```json
"tap": {
  "type": "navigate",
  "route": "/checkout/payment",
  "navigation_type": "push",
  "requireValidForm": true,
  "formId": "checkout-address-form"
}
```

**After (target):**

```json
"tap": {
  "type": "cubitCall",
  "cubit": "checkout",
  "method": "saveAddress",
  "requireValidForm": true,
  "formId": "checkout-address-form",
  "onSuccess": {
    "type": "navigate",
    "route": "/checkout/payment",
    "navigation_type": "push"
  }
}
```

---

## Acceptance (builder done when)

- [ ] Wizard routes wired with `cubitCall` checkout methods (not navigate-only for submit steps)
- [ ] Payment methods list uses `requestKey` + repeat binding
- [ ] Order success shows `checkout.lastOrder.orderNumber`
- [ ] Guest checkout form includes `guestEmail` field when unauthenticated

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-31 | | Initial spec — Phase 0 handoff |
