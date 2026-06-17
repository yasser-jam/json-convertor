# 07 — Shared Fields

Maps web shared field helpers ([docs/blocks.md §6](../../BLOCKS.md)) to mobile node props and `tap` actions.

---

## Color triple

Web blocks use `colorMode`, `colorTheme`, `colorFixed`.

| Web | Mobile |
|-----|--------|
| `colorMode: "theme"` + `colorTheme: "primary"` | `props.color: theme.colors.primary` (resolved hex at convert time) |
| `colorMode: "fixed"` + `colorFixed: "#..."` | `props.color: "#..."` |
| Text on colored background | Set `props.color` on `text` for foreground; container `style.color` for background |

Resolver reference: web `resolveContentColor(mode, theme, fixed)` → emit literal hex in mobile JSON.

### ColorKey map

| Web `colorTheme` | Mobile `theme.colors` key |
|------------------|---------------------------|
| `primary` | `primary` |
| `surface` | `surface` |
| `success` | `success` |
| `warning` | `warning` |
| `error` | `error` |
| `dark` | derive from `text` or `#10213a` |
| `text` | `text` |
| `neutral` | `muted` |

---

## Typography steps

Web block typography (theme/fixed mode):

| Web text size | Mobile `fontSize` (px) |
|---------------|------------------------|
| `xs` | 12 |
| `sm` | 14 |
| `md` | 16 |
| `lg` | 18 |
| `xl` | 22 |
| `2xl` | 28 |

| Web weight | Mobile `fontWeight` |
|------------|---------------------|
| `normal` | `"normal"` or 400 |
| `medium` | `"medium"` or 500 |
| `semibold` | `"semibold"` if supported else `"medium"` |
| `bold` | `"bold"` or 700 |

| Web `fontFamily` | Mobile |
|------------------|--------|
| `body` | theme `fontFamily` |
| `option1` | omit or custom if engine adds font slot |
| `option2` | omit or custom |

---

## Link object

Used by Button and Link blocks.

| Web sub-field | Mobile |
|---------------|--------|
| `kind: "page"` + `pageId` | `tap.navigate.route` after [05-navigation-and-routes.md](05-navigation-and-routes.md) |
| `kind: "url"` + `url` | External: `tap.type: "openUrl"`, `url`; in-app path: `navigate` |
| `newWindow: "on"` / `true` | `openUrl` (mobile always external browser) |

**Precedence:** If both `href` and `link` set, prefer `link` object.

---

## Button actions

| Web `buttonAction` | Mobile `tap` |
|--------------------|--------------|
| `link` | `{ "type": "navigate", "route": "...", "navigation_type": "push" }` |
| `login` | `{ "type": "navigate", "route": "/auth/login", "navigation_type": "push" }` |
| `logout` | `{ "type": "cubitCall", "cubit": "auth", "method": "logout", "onSuccess": { "type": "navigate", "route": "/auth/login", "navigation_type": "go" } }` |
| `addToCart` | `{ "type": "cubitCall", "cubit": "cart", "method": "addItem", "params": { ... } }` — see [blocks/11-commerce-blocks.md](blocks/11-commerce-blocks.md) |
| `addToWishlist` | **Gap:** `navigate` to `/wishlist` or noop + message until wishlist cubit exists |

### Button variant / size

| Web `variant` | Mobile `button.props` |
|---------------|----------------------|
| `primary` | default filled primary color |
| `secondary` | `variant: "secondary"` if supported else muted fill |
| `outline` | `variant: "outline"` |
| `ghost` | transparent / text button styling via props |
| `danger` | `color: theme.colors.error` |

| Web `size` | Mobile height from `theme.buttons.{sm,md,lg}` |
|------------|-----------------------------------------------|
| `fullWidth: "on"` | `fullWidth: true` on button |

---

## YouTube URL

Apply web normalizer logic before mobile output:

- `youtube.com/watch?v=ID` → embed URL for `videoPlayer.url`
- `youtu.be/ID`, `/shorts/ID` → same

Mobile `videoPlayer` may not support all YouTube embed policies — **fallback:** `openUrl` tap on thumbnail `image`.

---

## Bilingual labels

| Web field | When `language: "ar"` |
|-----------|----------------------|
| `label` + `labelAr` | `props.label` = `labelAr` if non-empty else `label` |
| Same for `titleAr`, `messageAr`, `placeholderAr` | Apply to corresponding mobile text props |

---

## Text color modes (Text block)

| Web `color: "default"` | `props.color: theme.colors.text` |
| Web `color: "muted"` | `props.color: theme.colors.muted` |

---

## Rich text (TipTap HTML)

Policy for `Heading`, `Text`, `Hero.description`, `Card.description`:

1. Strip scripts and unsafe tags
2. If only `<p>`, `<strong>`, `<em>`, `<a>` → `richtext` with simplified spans
3. Else → plain `text` with HTML stripped

**Gap:** Complex web typography in richtext — best-effort only.
