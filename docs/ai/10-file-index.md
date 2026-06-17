# 10 — File Index

## AI must know

Use this map to locate code. Prefer extending existing files over creating parallel patterns.

## Entry and config

| Path | Purpose |
|------|---------|
| `lib/main.dart` | App entry, `_kActiveConfig`, DI, router |
| `lib/engine/app_config_loader.dart` | Loads `assets/config/{id}.json` → `MobileAppConfig` |
| `assets/config/mobile_production_v2.json` | Active production UI + navigation |
| `lib/config/mobile_app_config.dart` | Top-level config model |
| `lib/config/component_config.dart` | Component tree node |
| `lib/config/screen_config.dart` | Page envelope |
| `lib/config/navigation_config.dart` | Tabs, shell excludes |

## Engine

| Path | Purpose |
|------|---------|
| `lib/engine/screen_renderer/screen_renderer.dart` | Renderer registry + recursion |
| `lib/engine/component_renderer/component_renderer.dart` | Renderer interface |
| `lib/engine/tree/renderers/*.dart` | Per-type renderers (20 files) |
| `lib/engine/tree/parsers/property_parsers.dart` | JSON → typed style values |
| `lib/engine/tree/parsers/data_context_path.dart` | Path resolution |
| `lib/engine/validation/component_schemas.dart` | Schema catalog |
| `lib/engine/actions/action_dispatcher.dart` | tap actions |
| `lib/engine/requests/request_mapper.dart` | Request collection from tree |
| `lib/engine/form/form_state_store.dart` | Dynamic forms |
| `lib/engine/tree/tree_engine.dart` | Public exports |

## Core

| Path | Purpose |
|------|---------|
| `lib/core/utils/service_locator.dart` | GetIt setup |
| `lib/core/utils/app_router.dart` | GoRouter from config |
| `lib/core/utils/api_service.dart` | HTTP helper |
| `lib/core/network/auth_interceptor.dart` | Token injection / refresh |
| `lib/core/network/auth_token_storage.dart` | Secure token store |
| `lib/core/network/network_config.dart` | Base URL, tenant |
| `lib/core/network/tenant_resolver.dart` | Tenant query params |
| `lib/core/navigation/auth_redirect.dart` | Auth guards |
| `lib/core/cubits/token_cubit/` | Session token state |
| `lib/core/enums/generic_component_type.dart` | Component type enum |
| `lib/core/widgets/` | Shared UI primitives |
| `lib/core/feedback/app_messenger.dart` | Top overlay user messages (`AppMessenger`) |
| `lib/core/errors/failures.dart` | Failure types |

## Features — auth

| Path | Purpose |
|------|---------|
| `lib/features/auth/data/repos/auth_repo_impl.dart` | OTP API |
| `lib/features/auth/presentation/manager/auth_cubit/` | Session cubit |
| `lib/features/auth/presentation/views/onboarding_view.dart` | Legacy onboarding |
| `lib/features/auth/presentation/views/widgets/auth.dart` | Legacy auth UI |

## Features — product

| Path | Purpose |
|------|---------|
| `lib/features/product/data/repos/product_repo_impl.dart` | Public catalog API |
| `lib/features/product/presentation/manager/product_cubit/` | Product lists |
| `lib/features/product/presentation/manager/product_detail_cubit/` | PDP |
| `lib/features/product/presentation/manager/product_search_cubit/` | Search |
| `lib/features/product/presentation/manager/product_autocomplete_cubit/` | Autocomplete |
| `lib/features/product/presentation/manager/category_cubit/` | Categories |

## Features — variant & shell

| Path | Purpose |
|------|---------|
| `lib/features/variantscreen/data/repos/variant_repository.dart` | JSON page parser |
| `lib/features/variantscreen/presentation/views/variant_screen.dart` | Dynamic host |
| `lib/features/variantscreen/presentation/manager/variant_cubit/` | Load state |
| `lib/features/shell/presentation/views/tab_shell_widget.dart` | Tab bar shell |
| `lib/features/homescreen/presentation/views/home_screen.dart` | Legacy fallback |

## Tests

| Path | Purpose |
|------|---------|
| `test/config/mobile_app_config_test.dart` | Config parsing |
| `test/engine/` | Actions, request mapper, parsers |
| `test/features/auth/` | Auth repo, interceptor |
| `test/features/product/` | Models, repos, cubits |
| `test/core/` | Failures, auth redirect, tenant |

## AI documentation (canonical)

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Root entry for assistants |
| `docs/ai/*.md` | Full reference suite |
| `.cursor/rules/*.mdc` | Cursor auto-context rules |

## Assets

| Path | Purpose |
|------|---------|
| `assets/translations/` | ar/en JSON (easy_localization) |
| `assets/icons/` | App icons |
