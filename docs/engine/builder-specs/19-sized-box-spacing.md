# Builder spec: sizedBox spacing primitive

> **Phase:** Layout — spacing cleanup  
> **Status:** `ready-for-builder`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-27  

---

## Summary

The mobile engine supports `type: sizedBox` — a leaf that maps to Flutter `SizedBox` for fixed blank spacing or constraining an optional child. Use instead of empty `container` nodes or the removed `spacer` type.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `type: sizedBox` | No | `Select-String` — 0 hits |
| Demo usage | Yes | `assets/config/mobile_component.json` (2 nodes) |

---

## Builder requirements

### 1. Fixed blank spacing

**Applies to:** `type` = `sizedBox`

**JSON shape (authoritative):**

```json
{
  "type": "sizedBox",
  "props": {
    "height": 16
  }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `width` | number | no | — | Horizontal extent (logical px) |
| `height` | number | no | — | Vertical extent (logical px) |
| `size` | number | no | — | Alias for `height` (parse-time) |

**Validation rules for builder:**

- At least one of `width` or `height` should be set for spacing-only nodes.
- Do not emit removed `type: spacer`.
- Prefer `gap` on parent `row`/`column` for uniform sibling spacing; use `sizedBox` for one-off fixed gaps.

**Optional child:** `child` constrains content to the given width/height (same as Flutter `SizedBox`).

---

## Spacing decision (builder)

| Intent | Use |
|--------|-----|
| Uniform sibling spacing | `gap` on `column`/`row` |
| Push to opposite ends | `mainAxisAlignment: "spaceBetween"` or `container.expand` |
| One fixed blank area | **`sizedBox`** with `height`/`width` |
| Different gaps per pair | Nested groups with different `gap`, or `container.margin` |

---

## Mobile engine reference (for builder team)

| Layer | File | Behavior |
|-------|------|----------|
| Renderer | `lib/engine/tree/renderers/sized_box_renderer.dart` | `SizedBox(width, height, child?)` |
| Schema | `lib/engine/validation/component_schemas.dart` | `width`, `height` optional |
| Parse alias | `lib/features/variantscreen/data/repos/variant_repository.dart` | `size` → `height` |

---

## Example: before / after

**Before (empty container hack):**

```json
{
  "type": "container",
  "props": { "height": 16 }
}
```

**After:**

```json
{
  "type": "sizedBox",
  "props": { "height": 16 }
}
```

---

## Acceptance (builder done when)

- [ ] Builder palette includes `sizedBox` with width/height fields
- [ ] Exported JSON uses `sizedBox` for fixed spacing (not `spacer` or empty `container`)
- [ ] Mobile app renders spacing without layout overflow

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-27 | | Initial spec — engine implemented; prod JSON not yet wired |
