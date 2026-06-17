# Builder spec: Accessibility props (image, card tap)

> **Phase:** 10 — P2 polish & accessibility  
> **Status:** `ready-for-builder`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-21  

---

## Summary

The mobile engine reads optional accessibility fields for **images** and **tappable cards** so TalkBack/VoiceOver can announce meaningful labels. Production JSON does not yet author these fields; product cards rely on card-level semantics once labels are added.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `props.semanticsLabel` on `image` | No | grep |
| `props.alt` on `image` | No | grep |
| `props.accessibilityLabel` on `card` | No | grep |
| `tap.semanticLabel` | No | grep |

---

## Builder requirements

### 1. Image semantics

**Applies to:** `type` = `image`

**JSON shape:**

```json
{
  "type": "image",
  "props": {
    "source": "network",
    "urlPath": "item.image",
    "semanticsLabel": "صورة المنتج",
    "alt": "Product photo"
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `semanticsLabel` | string | no | _(URL path segment or URL)_ | Primary VoiceOver label for the image |
| `alt` | string | no | — | Fallback if `semanticsLabel` omitted |

**Label resolution order:** `semanticsLabel` → `alt` → last URL path segment → full URL.

### 2. Tappable card semantics

**Applies to:** `type` = `card` with `tap`

**JSON shape:**

```json
{
  "type": "card",
  "props": {
    "accessibilityLabel": "منتج: سماعات لاسلكية"
  },
  "tap": {
    "type": "navigate",
    "route": "/product/details/:productId",
    "semanticLabel": "فتح تفاصيل المنتج"
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `accessibilityLabel` | string | no | `null` | Card button label for screen readers |
| `tap.semanticLabel` | string | no | — | Overrides `accessibilityLabel` when set |

**Suggested for product grids:** bind `accessibilityLabel` to item name (e.g. via builder template `{{item.name}}`).

---

## Mobile engine reference

| Layer | File | Behavior |
|-------|------|----------|
| Image | `lib/engine/tree/renderers/image_renderer.dart` | `Semantics(image: true, label: …)` |
| Card tap | `lib/engine/screen_renderer/screen_renderer.dart` | `Semantics(button: true)` around `GestureDetector` |

---

## Acceptance (builder done when)

- [ ] Builder can set `semanticsLabel` / `alt` on image nodes
- [ ] Builder can set `accessibilityLabel` and `tap.semanticLabel` on tappable cards
- [ ] Product grid cards in exported JSON include labels for a11y audit

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-21 | Phase 10 | Initial spec |
