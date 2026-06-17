# Builder spec: textFormField textDirection

> **Phase:** UI fixes — phone / numeric input  
> **Status:** `implemented-in-json`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-23  

---

## Summary

`textFormField` supports optional `textDirection` (`ltr` | `rtl`). When omitted and `keyboardType` is `phone`, the engine defaults to **LTR** so international numbers display as `+963…` in RTL apps.

---

## Gap vs production JSON

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `props.textDirection` on `textFormField` | Yes | `auth-login-phone`, `address-field-phone` |

---

## Builder requirements

### textFormField.textDirection

**Applies to:** `type` = `textFormField`

**JSON shape:**

```json
{
  "type": "textFormField",
  "props": {
    "id": "phone",
    "keyboardType": "phone",
    "textDirection": "ltr",
    "textAlign": "left"
  }
}
```

**Rules:**

- Use `ltr` + `left` for phone and E.164-style fields.
- Omit or use `rtl` + `right` for Arabic name/address copy.

---

## Mobile engine reference

- [`lib/engine/tree/renderers/text_form_field_renderer.dart`](../../../lib/engine/tree/renderers/text_form_field_renderer.dart)
- [`lib/engine/validation/component_schemas.dart`](../../../lib/engine/validation/component_schemas.dart) — `textFormField` optional `textDirection`
