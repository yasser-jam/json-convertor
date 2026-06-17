# Builder spec: High-traffic renderer props (button, appBar, text)

> **Phase:** 5 — High-traffic renderers  
> **Status:** `ready-for-builder`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-20  

---

## Summary

Phase 5 extends mobile renderers for `text`, `card`, `image`, `button`, and `appBar` with **EngineTheme** defaults and schema props. Production JSON does not yet author **`button.enabled`** or **`appBar.foregroundColor` / `titleColor`**. The builder must expose these fields so merchants can disable CTAs and set app bar title/icon colors without hardcoding in Dart.

Text props `maxLines`, `overflow`, and `fontStyle` are already in the engine schema (Phase 0); prod JSON has **0 usages** — optional builder UI for product titles and muted labels.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `props.enabled` on `button` | No | `Select-String -Pattern '"enabled"'` — 0 matches on buttons |
| `props.foregroundColor` on `appBar` | No | 0 matches |
| `props.titleColor` on `appBar` | No | 0 matches |
| `props.backgroundColor` on `appBar` | No | App bars use `style.background` (e.g. L631–632 `/home`) |
| `props.maxLines` / `overflow` on `text` | No | 0 matches (schema supports; engine implements) |
| `props.margin` on `card` | No | Margin used on `container` `style`, not card `props` |

---

## Builder requirements

### 1. Button disabled state

**Applies to:** `type` = `button`

**JSON shape (authoritative):**

```json
{
  "type": "button",
  "props": {
    "label": "إرسال الرمز",
    "variant": "elevated",
    "enabled": false
  },
  "tap": {
    "type": "cubitCall",
    "action": "requestOtp"
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `enabled` | boolean | no | `true` | When `false`, button is visually disabled and `onPressed` is null (no noop tap) |

**Pages to wire first (suggested):**

| Route | Notes |
|-------|-------|
| `/auth/login` | Disable submit while OTP in flight (when backend wiring exists) |
| `/checkout` | Disable pay CTA until form valid |

---

### 2. AppBar foreground and background

**Applies to:** `type` = `appBar`

**JSON shape (authoritative):**

```json
{
  "type": "appBar",
  "props": {
    "title": "SOOQ",
    "backgroundColor": "#FFFFFF",
    "foregroundColor": "#0F172A"
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `backgroundColor` | string (hex) | no | `theme.colors.surface` | Bar background |
| `foregroundColor` | string (hex) | no | `theme.colors.text` | Title and back icon color |
| `titleColor` | string (hex) | no | same as `foregroundColor` | Alias for title/icon color |

**Legacy (keep working):**

- `style.background` on appBar nodes is merged to `props.color` in the mobile parser and treated as **background** (not title color). Prefer emitting `props.backgroundColor` in new exports.

**Pages to wire first (suggested):**

| Route | Notes |
|-------|-------|
| `/home` | White bar + dark title (match `style.background` today) |
| `/auth/login` | Explicit `foregroundColor` for contrast on colored bars |

---

### 3. Text truncation (optional builder UI)

**Applies to:** `type` = `text`

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `maxLines` | number | no | unlimited | Line clamp |
| `overflow` | string | no | `ellipsis` when `maxLines` set, else `clip` | `ellipsis` \| `fade` \| `clip` \| `visible` |
| `fontStyle` | string | no | normal | `italic` \| `normal` |
| `typographyScale` | string | no | `md` | `xs` \| `sm` \| `md` \| `lg` when `fontSize` omitted |

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Button | `lib/engine/tree/renderers/button_renderer.dart` | M3 `FilledButton` / `OutlinedButton` / `TextButton`; `enabled` |
| AppBar | `lib/engine/tree/renderers/app_bar_renderer.dart` | Background vs foreground props; 48×48 back tap target |
| Text | `lib/engine/tree/renderers/text_renderer.dart` | `maxLines`, `overflow`, theme typography scale |
| Card | `lib/engine/tree/renderers/card_renderer.dart` | Theme `radius.md`, elevation 0, `margin` |
| Image | `lib/engine/tree/renderers/image_renderer.dart` | `loadingBuilder`, themed error/loading placeholders |
| Theme | `lib/engine/theme/engine_theme.dart` | Injected as `dataContext._engineTheme` |

---

## Example: appBar before / after

**Before (current prod):**

```json
{
  "type": "appBar",
  "props": { "title": "SOOQ" },
  "style": { "background": "#FFFFFF" }
}
```

**After (target):**

```json
{
  "type": "appBar",
  "props": {
    "title": "SOOQ",
    "backgroundColor": "#FFFFFF",
    "foregroundColor": "#0F172A"
  }
}
```

---

## Acceptance (builder done when)

- [ ] Builder can set `enabled` on `button` nodes
- [ ] Builder can set `backgroundColor` and `foregroundColor` (or `titleColor`) on `appBar`
- [ ] Exported JSON uses new fields on at least one pilot route
- [ ] Mobile app reflects disabled buttons and app bar colors without code changes

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-20 | Phase 5 | Initial spec |
