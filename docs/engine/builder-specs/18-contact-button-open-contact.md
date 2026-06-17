# Builder spec: Contact button and external actions

> **Phase:** Engine — contact CTAs  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-25  

---

## Summary

The mobile engine supports:

1. **`button`** optional `icon` / `iconPosition` / `iconGap` — label + Material icon with any standard `tap` (`navigate`, `cubitCall`, `apiCall`, …).
2. **`contactButton`** — channel-specific external CTAs (WhatsApp, tel, sms, email, url) with auto-disable when `target` / `targetPath` is empty.
3. **`tap` actions** `openUrl` and `openContact` — launch external apps via `url_launcher`.
4. **`app.supportWhatsApp`** / **`app.supportPhone`** — merchant contact targets in JSON `app` block.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `type: contactButton` | Yes | `/support` — `support-whatsapp-cta`, `support-call-cta` |
| `tap.type: openContact` | Yes | Same nodes |
| `app.supportWhatsApp` / `app.supportPhone` | Yes | `app` block |
| `button.icon` | No (optional) | Use on any page when needed |

---

## Builder requirements

### 1. `contactButton` component

**Applies to:** `type` = `contactButton`

**JSON shape:**

```json
{
  "type": "contactButton",
  "props": {
    "channel": "whatsapp",
    "label": "واتساب",
    "targetPath": "app.supportWhatsApp",
    "fullWidth": true,
    "borderRadius": 10,
    "fontSize": 14,
    "fontWeight": "bold"
  },
  "tap": {
    "type": "openContact",
    "channel": "whatsapp",
    "target": { "source": "app", "field": "supportWhatsApp" }
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `channel` | string | yes | — | `whatsapp` \| `tel` \| `sms` \| `email` \| `url` |
| `label` | string | yes | — | Button text |
| `target` | string | no | — | Static phone/email/url |
| `targetPath` | string | no | — | `dataContext` path (e.g. `app.supportPhone`) |
| `backgroundColor` | hex | no | channel default | Override fill color |
| `foregroundColor` | hex | no | channel default | Label/icon color |
| `fullWidth` | bool | no | `true` | Stretch horizontally |
| `borderRadius` | number | no | `10` | Corner radius |
| `icon` | string | no | channel default | Material icon name |
| `iconPosition` | string | no | `trailing` | `leading` \| `trailing` |

**Disable rule:** `onPressed` is null when resolved target is empty.

### 2. `button` with icon (general taps)

```json
{
  "type": "button",
  "props": {
    "label": "عرض السلة",
    "icon": "shopping_cart",
    "iconPosition": "leading",
    "fullWidth": true
  },
  "tap": { "type": "navigate", "route": "/cart", "navigation_type": "push" }
}
```

### 3. Actions `openUrl` / `openContact`

| `tap.type` | Fields | Behavior |
|------------|--------|----------|
| `openUrl` | `url` or `urlPath` | Opens HTTPS/http in external browser/app |
| `openContact` | `channel`, `target` (string or `{source,field}`) | Builds `wa.me`, `tel:`, `sms:`, `mailto:` URI |

Optional on both: `requireAuth: true`, `onUnauthenticated: { tap map }`.

### 4. App-level contact fields

```json
"app": {
  "supportWhatsApp": "963935237452",
  "supportPhone": "963935237452"
}
```

Digits only required for WhatsApp/tel/sms; non-digits are stripped at launch.

---

## Reference pages

| Route | Node ids | Notes |
|-------|----------|-------|
| `/support` | `support-whatsapp-cta`, `support-call-cta` | WhatsApp green + call primary |

---

## Mobile implementation

| Area | Path |
|------|------|
| Renderer | `lib/engine/tree/renderers/contact_button_renderer.dart` |
| Button icon row | `lib/engine/tree/renderers/button_label_row.dart` |
| Actions | `lib/engine/actions/action_dispatcher.dart` |
| URI builder | `lib/engine/actions/contact_uri_builder.dart` |
