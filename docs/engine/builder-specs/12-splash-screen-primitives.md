# Splash screen primitives — `stack`, `imageSlider`, `timer`, `progressIndicator`

**Phase:** 12  
**Status:** implemented-in-json  
**Active config:** `mobile_production_v2`  
**Created:** 2026-05-21  
**Updated:** 2026-05-21 — two-page product flow  

---

## Summary

The mobile engine supports composable splash layouts: layered `stack`, full-bleed `imageSlider`, `timer` auto-navigation, and `progressIndicator` for intro loading. Production uses a **two-page** startup: orange intro (`/splash`) then carousel CTA (`/splash-carousel`), then auth.

---

## Product flow (authoritative)

```mermaid
flowchart LR
  intro["/splash\nMode 2 intro variant"]
  carousel["/splash-carousel\nMode 1"]
  auth["/auth/login"]
  intro -->|"timer 3000ms"| carousel
  carousel -->|"button tap"| auth
```

| Step | Page id | Route | Spec mode |
|------|---------|-------|-----------|
| 1 | `page-splash` | `/splash` | Mode 2 **intro variant** (timer, no button) |
| 2 | `page-splash-carousel` | `/splash-carousel` | Mode 1 (carousel + button) |
| 3 | — | `/auth/login` | Auth (onboarding page removed) |

**Per-page rule:** each splash page uses **either** `timer` **or** button navigate — not both on the same page. The app chains two pages.

`navigation.initialRoute` remains `/splash`. `shellExcludeRoutes` includes `/splash` and `/splash-carousel` (not `/onboarding`).

**Auth (runtime, not JSON):** `/splash` intro shows on **every** cold start. `/splash-carousel` is **guest-only** — when a session token exists, the engine timer on `/splash` navigates to `/home` instead of the carousel, and direct visits to `/splash-carousel` redirect to `/home`.

---

## Gap vs production JSON

| Item | In prod JSON |
|------|----------------|
| `stack`, `imageSlider`, `timer` on splash pages | Yes |
| `progressIndicator` on `/splash` | Yes |
| `scroll: "none"` on both splash pages | Yes |
| `timer` on `/splash` → `/splash-carousel` | Yes |
| Button on `/splash-carousel` → `/auth/login` | Yes |
| `indicatorStyle: "pill"` | Yes |
| `page-onboarding` | **Removed** |

---

## Design decisions (canonical)

| Topic | Choice |
|-------|--------|
| Carousel | Dedicated `imageSlider` |
| Auto-leave (per page) | `timer` component **or** button `tap` |
| Two-page startup | Intro timer page, then carousel button page |
| Stack overlays | `stackLayer` + `stackAlign` or `stackInsetBottom` (px from bottom); optional `stackWidthFactor` (1 = full width) |
| Intro loading UI | `progressIndicator` + `text` in `row` |
| Dot UI | `indicatorStyle`: `dot` (default) \| `pill` |
| Button width | `maxWidth` (px) or `fullWidth: true` |

---

## Builder requirements

### 1. `stack`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `children` | node[] | required | Back → front paint order |
| `fit` | string | `expand` | `expand` \| `loose` |

**Per-child props:**

| Field | Default | Description |
|-------|---------|-------------|
| `stackLayer` | index 0 → `fill` | `fill` \| `positioned` |
| `stackAlign` | `bottomCenter` when positioned | Alignment string (same as button) |
| `stackInsetBottom` | — | Px from screen bottom; uses `Positioned(bottom:)` (preferred for splash footers) |
| `stackWidthFactor` | — | e.g. `1` stretches overlay to full width |

---

### 2. `imageSlider`

| Field | Default | Description |
|-------|---------|-------------|
| `images` | required | string[] or `{url, alt?}[]` |
| `fit` | `cover` | Box fit |
| `autoPlay` | `true` when multi | |
| `intervalMs` | `1000` | |
| `showIndicators` | `true` when multi | |
| `indicatorPosition` | `bottom` | `top` \| `bottom` |
| `indicatorColor` | theme primary | Active |
| `indicatorInactiveColor` | theme muted | Inactive |
| `indicatorStyle` | `dot` | `dot` \| `pill` (active dash) |
| `indicatorBottomPadding` | `24` | Bottom inset for dot row (above footer CTA/version) |
| `animationDurationMs` | `300` | |

---

### 3. `timer`

| Field | Description |
|-------|-------------|
| `durationMs` | required |
| `route` | shorthand navigate |
| `tap` | optional `{ type: navigate, route }` |

Invisible UI; place inside `stack`.

---

### 4. `progressIndicator`

| Field | Default | Description |
|-------|---------|-------------|
| `color` | theme | Stroke color (hex) |
| `strokeWidth` | `2` | |
| `size` | `24` | Width and height |

---

### 5. `button` (splash CTA extras)

In addition to existing `label`, `variant`, colors, `borderRadius`, `padding`, `alignment`, `maxWidth`, `fullWidth`:

| Field | Description |
|-------|-------------|
| `fontSize` | Label font size |
| `fontWeight` | e.g. `bold` |
| `letterSpacing` | Optional |

---

### 6. Page `scroll: "none"`

See [08-page-scroll.md](08-page-scroll.md).

---

## Splash modes

### Mode 1 — Multi-image carousel + button (`/splash-carousel`)

Production reference: `page-splash-carousel` in `mobile_production_v2.json`.

- Full-bleed `imageSlider` (no top logo/headline)
- `indicatorStyle: "pill"`, `indicatorColor: "#4A4BB3"`, `indicatorBottomPadding` tuned above version
- Bottom footer `column`: wide purple CTA (`maxWidth: 320`) → `Version 1.0.0`
- Body wrapped in `container` `expand: true` for full viewport height
- `tap`: `/auth/login`

### Mode 2 — Single image + timer (canonical full-bleed)

```json
{
  "type": "stack",
  "children": [
    {
      "type": "imageSlider",
      "props": {
        "images": ["https://cdn.example/splash-hero.jpg"],
        "fit": "cover"
      }
    },
    {
      "type": "timer",
      "props": { "durationMs": 3000, "route": "/splash-carousel" }
    }
  ]
}
```

### Mode 2 intro variant — orange + asset logo (`/splash`)

Production reference: `page-splash` — page `background` + centered `image` asset (not full-bleed `imageSlider`).

- `background: "#FF4F00"`
- Asset logo: `assets/icons/app_logo.png`, `source: "asset"`, `fit: "contain"`
- Loading: `row` with `text` + `progressIndicator`
- Version text at bottom
- `timer` → `/splash-carousel`

### Mode 3 — Timer only

Mode 2 without extra overlay children.

---

## Mobile engine reference

| Layer | File |
|-------|------|
| Stack | `lib/engine/tree/renderers/stack_renderer.dart` |
| Slider | `lib/engine/tree/renderers/image_slider_renderer.dart` |
| Timer | `lib/engine/tree/renderers/timer_renderer.dart` |
| Progress | `lib/engine/tree/renderers/progress_indicator_renderer.dart` |
| Button | `lib/engine/tree/renderers/button_renderer.dart` |
| Registry | `lib/engine/screen_renderer/screen_renderer.dart` |

---

## Verification

```powershell
Select-String -Path assets\config\mobile_production_v2.json -Pattern "splash-carousel|progressIndicator|page-splash"
Select-String -Path assets\config\mobile_production_v2.json -Pattern "page-onboarding"
```

Second command should return no matches after onboarding removal.
