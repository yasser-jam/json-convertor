# Builder spec: appDrawer, tabs, otpInput

> **Phase:** Engine primitives  
> **Status:** `otpInput` implemented-in-json; `appDrawer` + in-page `tabs` ready-for-builder  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-23  

---

## Summary

Three new JSON component types for the mobile engine: side **drawer** registration (`appDrawer`), in-page **segment tabs** (`tabs` — not `navigation.tabs` shell), and **multi-box OTP** (`otpInput`) integrated with forms and `verifyOtp`.

---

## Gap vs production JSON

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `type: otpInput` on `/auth/otp-reset` | Yes | `auth-otp-code` node |
| `type: appDrawer` | No | — |
| In-page `type: tabs` (not `navigation.tabs`) | No | — |
| `tap.type: openDrawer` / `closeDrawer` | No | — |

---

## 1. `appDrawer`

**Applies to:** `type` = `appDrawer`

Registers drawer content for the current page. Renders nothing in the layout (`SizedBox.shrink`); [ScreenRenderer] wraps the page in an inner `Scaffold` with `drawer` / `endDrawer`.

```json
{
  "type": "appDrawer",
  "props": {
    "drawerEdge": "start",
    "width": 280,
    "backgroundColor": "#FFFFFF"
  },
  "child": {
    "type": "column",
    "children": []
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `drawerEdge` | string | no | `start` | `start` → `Scaffold.drawer`; `end` → `Scaffold.endDrawer` |
| `width` | number | no | `280` | Drawer width |
| `backgroundColor` | string (hex) | no | theme surface | Drawer background |

**Open drawer (button `tap`):**

```json
"tap": { "type": "openDrawer" }
```

Optional `drawerEdge: "end"` on the action when using `endDrawer`.

**Close:** `{ "type": "closeDrawer" }`

**Placement:** Anywhere in `pages[].body`; last `appDrawer` wins if multiple.

**Safe area:** The mobile engine wraps the drawer `child` in `SafeArea` automatically (status bar, notch, home indicator). Not configurable in JSON — do not add fixed top padding for system insets.

---

## 2. `tabs` (in-page)

**Not** `navigation.type: "tabs"` (bottom shell). Controlled selection from JSON / `dataContext`.

```json
{
  "type": "tabs",
  "props": {
    "selectedIndex": 0,
    "selectedIndexPath": "filterTabIndex",
    "spacing": 6,
    "runSpacing": 4,
    "activeColor": "#F97316",
    "inactiveColor": "#0F172A",
    "indicatorWidth": 2
  },
  "data": {
    "items": [
      { "title": "الكل", "index": 0 },
      { "title": "بيع", "index": 1 }
    ]
  },
  "tap": {
    "type": "cubitCall",
    "cubit": "auth",
    "method": "requestOtp",
    "params": {
      "index": { "source": "tap", "field": "index" }
    }
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `selectedIndex` | number | no | `0` | Static selected tab index |
| `selectedIndexPath` | string | no | — | Dotted path in `dataContext` (overrides static when set) |
| `data.items` | array | yes* | — | `{ title, index }` per tab |
| `tap` | action | no | — | Dispatched per tab with `dataContext.tap.index` |

\*Empty `items` renders nothing.

**Note:** Example `cubit: home` / `setFilter` requires feature wiring in `VariantScreen`; engine only dispatches `tap`.

---

## 3. `otpInput`

**Implemented** on `page-auth-otp-reset` (`auth-otp-code`).

```json
{
  "type": "otpInput",
  "props": {
    "fieldId": "otpCode",
    "length": 6,
    "boxWidth": 48,
    "boxHeight": 56,
    "gap": 8,
    "autofocus": true,
    "validateRequired": true,
    "validateMinLength": 6,
    "validateMaxLength": 6
  },
  "style": {
    "background": "#FFFFFF",
    "borderRadius": 12,
    "border": { "width": 1, "color": "#94A3B8" }
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `fieldId` | string | no | `otpCode` | `FormStateStore` key; must match `verifyOtp` `source: form` field |
| `length` | number | no | `6` | Digit count (backend expects 6) |

Submit via existing button `cubitCall` `verifyOtp` + `requireValidForm` — **no** auto-verify on last digit.

---

## Mobile implementation references

| Piece | Path |
|-------|------|
| Renderers | `lib/engine/tree/renderers/app_drawer_renderer.dart`, `tabs_renderer.dart`, `otp_input_renderer.dart` |
| Drawer wrap | `lib/engine/screen_renderer/screen_renderer.dart` |
| Drawer safe area | `lib/engine/tree/renderers/app_drawer_renderer.dart` — `SafeArea` around drawer `child` (not in JSON) |
| Actions | `lib/engine/actions/action_dispatcher.dart` (`openDrawer`, `closeDrawer`, `source: tap`) |

---

## Builder checklist

- [ ] UI for `appDrawer` + menu child tree  
- [ ] UI for in-page `tabs` + `data.items`  
- [ ] OTP builder: 6 boxes, `fieldId`, validation props  
- [ ] Document `openDrawer` on menu buttons  
