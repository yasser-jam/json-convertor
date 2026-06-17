# Page layout preset — `layout: "centered"`

> **Phase:** Layout improvement (Phase 3)  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-23  

---

## Summary

Optional `pages[].layout: "centered"` tells the mobile engine to build a full-viewport, non-scrolling page shell for splash and similar screens. The repository forces `pageScroll: none`, sets the root column to `mainAxisSize: max` + `crossAxisAlignment: stretch`, and injects a synthetic `container` with `expand: true` when the body has no expand node.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `pages[].layout: "centered"` | Yes | `/splash`, `/splash-carousel`, `/auth/login`, `/auth/otp-reset` |
| Manual `scroll: "none"` on centered pages | No (removed; engine forces `none`) | grep `layout` on splash routes |

---

## Builder requirements

### 1. Page layout preset

**Applies to:** `pages[]` entry (page-level field, not a component `type`)

**JSON shape (authoritative):**

```json
{
  "id": "page-splash",
  "route": "/splash",
  "layout": "centered",
  "background": "#4A4BB3",
  "body": [
    {
      "type": "container",
      "props": { "expand": true },
      "child": { "type": "stack", "children": [] }
    }
  ]
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `layout` | string | no | _(omit)_ | When `"centered"`, engine applies preset below |
| `scroll` | string | no | `vertical` | Ignored/overridden to `none` when `layout: centered` |

**Engine behavior when `layout: "centered"`:**

| Step | Result |
|------|--------|
| `pageScroll` | Forced to `none` on synthetic scaffold |
| Root column | `mainAxisSize: max`, `crossAxisAlignment: stretch` |
| Expand injection | If body has no `container` with `expand: true`, wrap first body node in synthetic expand container |
| Validator | Exempt from `viewport_center_without_expand` and `static_page_overflow_risk` |

**Validation rules for builder:**

- Use `layout: centered` for full-screen splash / onboarding — not for catalog or long forms.
- **Do not emit `type: spacer`** — removed from engine. Use spacing decision instead:

| Intent | Use |
|--------|-----|
| Uniform sibling spacing | `gap` on `column`/`row` |
| Push to opposite ends | `mainAxisAlignment: "spaceBetween"` or `container.expand` |
| Fixed blank area | `sizedBox` with `height`/`width` |
| Different gaps per pair | Nested `row`/`column` with different `gap`, or `container.margin` |

- Do not nest `singleChildScrollView` under normal pages; use page `scroll: vertical` or inner list/grid scroll.

**Pages wired in production (reference):**

| Route | Notes |
|-------|-------|
| `/splash` | Intro splash; expand container + stack |
| `/splash-carousel` | Carousel splash |
| `/auth/login` | Login form; expand + column `mainAxis: center` for vertical centering |
| `/auth/otp-reset` | OTP verify form; same centered body pattern |

**App bar title alignment:** use `appBar.props.titleAlign` — `start` (default), `center`, or `end`. `start`/`end` follow app text direction (RTL app → title on the right by default). Home uses `center` for the SOOQ brand title.

**Auth pages** use `layout: centered` with an explicit expand container and inner column `mainAxis: center` so the form block sits vertically centered under the app bar.

---

## Mobile implementation

| File | Role |
|------|------|
| `lib/features/variantscreen/data/repos/variant_repository.dart` | Preset + `pageLayout` / `pageRoute` on scaffold props |
| `lib/engine/validation/layout_constraint_validator.dart` | Parse-time rules + centered exemption |

---

## Related

- [08-page-scroll.md](08-page-scroll.md) — `pages[].scroll`
- [LAYOUT_IMPROVEMENT_PLAN.md](../LAYOUT_IMPROVEMENT_PLAN.md)
