# 12 — Testimonial Blocks

Web testimonial blocks ([docs/blocks.md §5.4](../../BLOCKS.md)). No mobile domain type — **decompose to cards**.

---

## TestimonialCard

### Web contract

| Prop | Default |
|------|---------|
| `testimonial` | select from fixture `t-1`, `t-2`, `t-3` |
| `showAvatar`, `showRating` | on |
| `variant` | default/outlined/elevated |

Fixture shape: `{ id, name, nameAr, role, roleAr, avatar, rating, text, textAr }`.

### Mobile decomposition

```
card
  └── column
        ├── image (avatar, circular)
        ├── row (stars as icon/text)
        ├── text (quote — prefer textAr if language ar)
        ├── text (name)
        └── text (role, muted)
```

### Prop mapping

| Web | Mobile |
|-----|--------|
| `testimonial` id | Inline static content from fixture at convert time |
| `showAvatar: off` | omit image |
| `showRating: off` | omit stars row |
| `variant` | card elevation/border |

### Gaps

- No testimonial API in mobile engine — converted JSON uses **static text** from web fixture unless future `requestUrl` added.
- Rating stars: repeat `icon` name `star` or text `"★".repeat(rating)`.

### Before / after

**Web:**

```json
{
  "type": "TestimonialCard",
  "props": {
    "testimonial": "t-1",
    "showAvatar": "on",
    "showRating": "on",
    "variant": "elevated"
  }
}
```

**Mobile (excerpt, AR copy from fixture):**

```json
{
  "id": "testimonial-card-1",
  "type": "card",
  "props": { "elevation": 2, "borderRadius": 12 },
  "child": {
    "id": "testimonial-col-2",
    "type": "column",
    "props": { "gap": 8, "crossAxis": "start" },
    "children": [
      {
        "id": "testimonial-text-3",
        "type": "text",
        "props": {
          "value": "منتج رائع وخدمة ممتازة!",
          "fontSize": 14,
          "textAlign": "right"
        }
      },
      {
        "id": "testimonial-name-4",
        "type": "text",
        "props": { "value": "سارة", "fontWeight": "bold", "fontSize": 14 }
      }
    ]
  }
}
```

---

## TestimonialGrid

### Decomposition

`column` of `row` groups OR `gridView` **without API** — static children from fixture list.

| Web | Mobile |
|-----|--------|
| `columns` 1–4 | `crossAxisCount` on gridView, or manual row chunking |
| `gap` | spacing |
| `maxItems` | slice fixture array |
| `cardVariant` | pass to each TestimonialCard decomposition |

### Layout

Prefer `gridView` with fixed static `children` (converted cards) — **do not** use fake `requestUrl`.

### Gaps

- Dynamic testimonial CMS not wired — static conversion only.
