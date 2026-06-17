# 06 — Feature: Auth

## AI must know

- Customer OTP flow — **not** merchant staff login unless config says otherwise.
- Endpoints use `/api/v1/customer/auth/otp/*` (implemented paths in `auth_repo_impl.dart`).
- JSON auth screens use same repos via `cubitCall` actions or legacy `auth.dart` widgets.
- Register new auth APIs in `AuthRepo` + `service_locator` — never in engine renderers.

## Structure

```
lib/features/auth/
├── data/models/     — CustomerOtpRequest, CustomerOtpVerifyRequest, AuthTokenResponse, User
├── data/repos/      — auth_repo.dart, auth_repo_impl.dart
└── presentation/manager/
    ├── auth_cubit/
    ├── create_user_cubit/
    ├── verify_user_cubit/
    ├── resend_email_cubit/
    └── index_address_year_cubit/
```

Legacy views: `presentation/views/onboarding_view.dart`, `widgets/auth.dart`, `widgets/auth_widgets/`.

## API endpoints (implemented)

| Method | Path | Repo method |
|--------|------|-------------|
| POST | `/api/v1/customer/auth/otp/request` | `requestOtp` |
| POST | `/api/v1/customer/auth/otp/verify` | `verifyOtp` |

Request bodies: `CustomerOtpRequest`, `CustomerOtpVerifyRequest` with `validate()` before network.

Response: `AuthTokenResponse` — tokens saved via `AuthTokenStorage` on verify.

## Error handling

- Returns `Either<Failure, T>` (dartz)
- `AuthFailure`, network retries on OTP request (3 attempts with backoff)

## Cubits

| Cubit | Role |
|-------|------|
| `AuthCubit` | Session, logout, coordinates repo + `TokenCubit` |
| `CreateUserCubit` | Registration flow state |
| `VerifyUserCubit` | OTP verification UI state |
| `ResendEmailCubit` | Resend timing/state |
| `IndexAddressYearCubit` | Address/year picker data |

## JSON integration

- Routes in `shellExcludeRoutes`: `/auth/login`, `/auth/otp-reset`
- `EngineActionDispatcher` `cubitCall` can target `AuthCubit` methods
- `VariantScreen` may wrap auth routes with `BlocProvider` when `_isAuthRoute`

## Models (key files)

- `auth_token_response.dart`
- `customer_otp_request.dart`, `customer_otp_verify_request.dart`
- `user_model/user.dart`, `user_model.dart`

## Adding auth capability

1. Add model + repo method in `data/`
2. Extend `AuthCubit` or dedicated cubit in `presentation/manager/`
3. Register in `service_locator.dart` if new singleton/factory
4. Wire JSON `tap` / form actions if screen is config-driven
5. Test: `test/features/auth/data/repos/auth_repo_impl_test.dart`

## Anti-patterns

- Storing tokens in widget state
- Using `/api/v1/auth/otp/*` (old path — use `customer/auth`)
- Building login UI only in Dart when JSON route exists

## Related

- [05-core.md](05-core.md)
- [04-actions-and-requests.md](04-actions-and-requests.md)
