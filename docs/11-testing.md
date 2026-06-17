# 11 — Testing

## AI must know

- Run `flutter test` from project root.
- Mirror production structure under `test/`.
- Mock `Dio` / repos — do not hit real Railway API in unit tests.
- Engine tests focus on `ActionDispatcher`, `RequestMapper`, parsers — not full JSON file.

## Test layout

```
test/
├── widget_test.dart
├── config/mobile_app_config_test.dart
├── core/
│   ├── errors/failures_test.dart
│   ├── navigation/auth_redirect_test.dart
│   └── network/tenant_resolver_test.dart
├── engine/
│   ├── actions/action_dispatcher_*_test.dart
│   ├── requests/request_mapper_resolve_test.dart
│   └── tree/parsers/data_context_path_test.dart
└── features/
    ├── auth/ — repo, interceptor, support/auth_test_utils.dart
    └── product/ — models, repos, cubits, support/product_test_utils.dart
```

No `integration_test/` directory currently.

## Patterns

### Repository tests

- Inject mock `Dio` with `MockAdapter` or hand-stubbed responses
- Assert `Either` Right/Left outcomes
- Example: `test/features/product/data/repos/product_repo_impl_test.dart`

### Cubit tests

- `bloc_test` pattern or manual `expect` on emitted states
- Mock `ProductRepo` interface
- Example: `test/features/product/presentation/manager/product_cubit/`

### Engine tests

- Pure Dart — no `WidgetTester` required for mapper/dispatcher
- Pass minimal `ScreenConfig` / `ComponentConfig` trees
- Example: `test/engine/requests/request_mapper_resolve_test.dart`

### Config tests

- Load sample JSON fragment or build `Map` inline
- `test/config/mobile_app_config_test.dart`

## Support utilities

- `test/features/auth/support/auth_test_utils.dart`
- `test/features/product/support/product_test_utils.dart`

Reuse these when adding feature tests.

## What to test for new work

| Change | Minimum tests |
|--------|----------------|
| New repo method | Repo impl test with mock HTTP |
| New cubit | Emit loading/success/failure |
| New renderer | Widget test or golden optional |
| Request mapper rule | Unit test with synthetic tree |
| JSON schema change | Config parse test if top-level shape changes |

## Anti-patterns

- Testing against `mobile_production_v2.json` whole file (slow, brittle)
- Skipping failure paths in repos
- Widget tests that require full app DI without overrides

## Related

- [09-workflows.md](09-workflows.md)
