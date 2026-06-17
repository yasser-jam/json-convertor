# Builder spec: Form autovalidateMode

> **Phase:** 6 — Auth form renderers  
> **Status:** `ready-for-builder`  
> **Active config:** `mobile_production_v2`  
> **Created:** 2026-05-21  

---

## Summary

Phase 6 adds optional **`props.autovalidateMode`** on `form` components. The mobile engine passes this to Flutter’s `Form` widget. Production JSON does not author this prop yet; forms rely on per-field `AutovalidateMode.onUserInteraction` on `textFormField` when validation flags are set.

---

## Gap vs production JSON

**Checked in** `assets/config/mobile_production_v2.json`:

| Item | Exists in prod JSON? | Evidence |
|------|----------------------|----------|
| `props.autovalidateMode` on `form` | No | `Select-String -Pattern "autovalidateMode"` — 0 matches |

---

## Builder requirements

### 1. Form-level autovalidate

**Applies to:** `type` = `form`

**JSON shape (authoritative):**

```json
{
  "type": "form",
  "props": {
    "formId": "otp-request-form",
    "autovalidateMode": "onUserInteraction"
  },
  "child": { "type": "column", "children": [] }
}
```

| Field | Type | Required | Default (mobile) | Description |
|-------|------|----------|------------------|-------------|
| `autovalidateMode` | string | no | `disabled` | `onUserInteraction` — validate fields after first user edit; `disabled` — validate only on explicit `FormState.validate()` (e.g. submit with `requireValidForm`) |

**Allowed values:** `onUserInteraction` | `disabled` (any other value → `disabled`)

**Pages to wire first (suggested):** `/auth/login`, `/auth/otp-reset` — only if product wants form-wide autovalidate before submit tap.

---

## Mobile engine reference

- [`lib/engine/tree/renderers/form_renderer.dart`](../../lib/engine/tree/renderers/form_renderer.dart)

---

## Related

- Auth forms: `/auth/login`, `/auth/otp-reset` in `mobile_production_v2.json`
- Submit validation: `tap.requireValidForm` + `tap.formId` must match `props.formId`
