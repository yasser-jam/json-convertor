# Builder spec: AppBar layout/UI (elevation, transparent background)

> **Phase:** AppBar layout/UI  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-24  

---

## Summary

Mobile engine supports **flat and transparent app bars** via `appBar.props.elevation` and alpha-aware `backgroundColor` (`#AARRGGBB` or `transparent`). The app bar renders **edge-to-edge under the status bar**; body content is wrapped in `SafeArea` automatically by the engine (not configurable in JSON).

Reference page: `/product/details/:productId` (`product-details-appbar`).

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `props.elevation` on `appBar` | Yes | `/product/details/:productId` — `"elevation": 0` |
| `props.backgroundColor` transparent on `appBar` | Yes | Same node — `"backgroundColor": "#00000000"` |
| `props.backgroundColor` `#AARRGGBB` elsewhere on `appBar` | No | Only product details uses alpha today |
| `transparent` literal on `appBar` | No | Engine supports; builder may expose as preset |

---

## Builder requirements

### 1. AppBar elevation

**Applies to:** `type` = `appBar`

```json
{
  "type": "appBar",
  "props": {
    "title": "تفاصيل المنتج",
    "elevation": 0
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `elevation` | number | no | `1` | Material shadow; use `0` for flat/overlay bars |

### 2. AppBar transparent / alpha background

**Applies to:** `type` = `appBar`

```json
{
  "type": "appBar",
  "props": {
    "backgroundColor": "#00000000",
    "foregroundColor": "#0F172A",
    "elevation": 0
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `backgroundColor` | string | no | `theme.colors.surface` | `#RRGGBB`, `#AARRGGBB`, or `transparent` |
| `foregroundColor` | string (hex) | no | `theme.colors.text` | Title and icon color |

**Legacy:** `style.background` on appBar nodes still merges to background via the mobile parser. Prefer `props.backgroundColor` for new exports.

**Pages to wire first (suggested):**

| Route | Notes |
|-------|-------|
| `/product/details/:productId` | Implemented — transparent overlay over hero image |
| `/home` | Keep opaque white bar unless design changes |

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| App bar renderer | `lib/engine/tree/renderers/app_bar_renderer.dart` | `elevation`, status-bar top padding, transparent `Material` |
| Color parser | `lib/engine/tree/parsers/property_parsers.dart` | `#RRGGBB`, `#AARRGGBB`, `transparent` |
| SafeArea split | `lib/engine/tree/renderers/column_renderer.dart` | Root column `safeAreaBody: true` — body only, app bar edge-to-edge |
| Page shell | `lib/features/variantscreen/data/repos/variant_repository.dart` | Injects `safeAreaBody` on root column (not author-facing JSON) |

**Not in JSON:** automatic back when navigation stack can pop; body-only `SafeArea`.

---

## Acceptance

- [x] `elevation: 0` on product details app bar in prod JSON
- [x] Transparent `backgroundColor` on product details app bar in prod JSON
- [x] Engine tests for elevation, transparent color, SafeArea split
