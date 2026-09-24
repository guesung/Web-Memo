# Supabase 인벤토리

> 이 문서는 자동 생성됩니다. 손으로 고치지 마세요.
> 생성기: `.github/scripts/supabase/generate-supabase-inventory.mjs` · 갱신: `chore-supabase-inventory.yml`

운영 Supabase 프로젝트 `czwtqukymcqoberdoltq`를 읽기 전용으로 조회한 결과입니다.
운영 상태가 이 문서와 달라지면 매일 08:00 KST 실행이 갱신 PR을 열고, 다시 같아지면 그 PR을 닫습니다.

## 수록 범위

- PostgreSQL의 모든 스키마를 카탈로그에서 찾아 싣습니다. 새 스키마도 자동으로 나타납니다.
- 테이블은 컬럼 이름과 타입을 싣습니다. 파티션 자식 테이블은 뺍니다.
- DB 함수는 이름·입력 타입·반환 타입을 싣습니다. 확장(extension)이 설치한 함수는 뺍니다.
- Edge Function은 이름과 **배포 버전**을 싣습니다. 배포 버전은 함수를 배포할 때마다 1씩 오르는 번호이며, Edge Runtime이나 Deno 버전이 아닙니다. 정확한 Runtime 버전은 현재 쓰는 조회 경로(Management API)에서 얻을 수 없어 싣지 않습니다.
- 행 데이터, secret 값, 함수 본문, Webhook URL은 싣지 않습니다. 조회 시각과 건강 상태처럼 수시로 바뀌는 값도 싣지 않습니다.

## 앱 스키마

### `billing`

#### 테이블 `billing.ai_usage`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `period_start` | `timestamp with time zone` |
| `period_end` | `timestamp with time zone` |
| `feature` | `text` |
| `estimated_cost_micros` | `integer` |
| `actual_cost_micros` | `integer` |
| `status` | `text` |
| `created_at` | `timestamp with time zone` |

#### 테이블 `billing.charges`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `order_id` | `text` |
| `idempotency_key` | `text` |
| `amount_krw` | `integer` |
| `status` | `billing.charge_status` |
| `toss_payment_key` | `text` |
| `failure_code` | `text` |
| `failure_message` | `text` |
| `requested_at` | `timestamp with time zone` |
| `resolved_at` | `timestamp with time zone` |
| `dispatched_at` | `timestamp with time zone` |
| `raw_response` | `jsonb` |

#### 테이블 `billing.customer_secrets`

| 컬럼 | 타입 |
| --- | --- |
| `user_id` | `uuid` |
| `toss_customer_key` | `text` |
| `billing_key_ciphertext` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `billing.subscriptions`

| 컬럼 | 타입 |
| --- | --- |
| `user_id` | `uuid` |
| `status` | `billing.subscription_status` |
| `current_period_start` | `timestamp with time zone` |
| `current_period_end` | `timestamp with time zone` |
| `cancel_at_period_end` | `boolean` |
| `price_krw` | `integer` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### DB 함수 (7개)

| 함수 | 반환 타입 |
| --- | --- |
| `cancel_subscription(target_user_id uuid)` | `void` |
| `complete_subscription_charge(target_user_id uuid, target_order_id text, target_period_start timestamp with time zone, target_period_end timestamp with time zone, target_payment_key text, target_payment jsonb)` | `void` |
| `enforce_charge_start()` | `trigger` |
| `is_paid_user(target_user_id uuid)` | `boolean` |
| `prepare_charge_dispatch(target_user_id uuid, target_order_id text, target_recovery boolean)` | `text` |
| `reserve_ai_usage(target_user_id uuid, target_feature text, target_estimated_cost_micros integer)` | `uuid` |
| `settle_ai_usage(target_reservation_id uuid, target_actual_cost_micros integer)` | `void` |

### `feedback`

#### 테이블 `feedback.feedbacks`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `created_at` | `timestamp with time zone` |
| `content` | `text` |
| `user_id` | `uuid` |
| `email` | `text` |

### `memo`

#### 테이블 `memo.category`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `name` | `text` |
| `user_id` | `uuid` |
| `created_at` | `timestamp with time zone` |
| `color` | `text` |
| `memo_count` | `integer` |

#### 테이블 `memo.highlight`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `user_id` | `uuid` |
| `url` | `text` |
| `title` | `text` |
| `favIconUrl` | `text` |
| `exact_text` | `text` |
| `prefix_text` | `text` |
| `suffix_text` | `text` |
| `text_position_start` | `integer` |
| `color` | `text` |
| `note` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `memo.memo`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `memo` | `text` |
| `user_id` | `uuid` |
| `url` | `text` |
| `title` | `text` |
| `favIconUrl` | `text` |
| `updated_at` | `timestamp with time zone` |
| `isWish` | `boolean` |
| `category_id` | `bigint` |
| `created_at` | `timestamp with time zone` |
| `is_public` | `boolean` |
| `shared_at` | `timestamp with time zone` |
| `like_count` | `integer` |
| `bookmark_count` | `integer` |
| `comment_count` | `integer` |
| `isStar` | `boolean` |
| `impression` | `text` |
| `actionItem` | `text` |
| `isReading` | `boolean` |
| `deleted_at` | `timestamp with time zone` |

#### 테이블 `memo.notice`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `title_ko` | `text` |
| `title_en` | `text` |
| `body_ko` | `text` |
| `body_en` | `text` |
| `link_label_ko` | `text` |
| `link_label_en` | `text` |
| `link_target` | `text` |
| `starts_at` | `timestamp with time zone` |
| `ends_at` | `timestamp with time zone` |
| `created_at` | `timestamp with time zone` |

#### 테이블 `memo.notification_log`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `user_id` | `uuid` |
| `memo_id` | `bigint` |
| `sent_at` | `timestamp with time zone` |

#### 테이블 `memo.notification_setting`

| 컬럼 | 타입 |
| --- | --- |
| `user_id` | `uuid` |
| `isEnabled` | `boolean` |
| `notifyTime` | `time without time zone` |
| `timezone` | `text` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `memo.profiles`

| 컬럼 | 타입 |
| --- | --- |
| `user_id` | `uuid` |
| `share_mode` | `text` |
| `nickname` | `text` |
| `role` | `text` |
| `avatar_url` | `text` |
| `bio` | `text` |
| `website` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `follower_count` | `integer` |
| `following_count` | `integer` |

#### 테이블 `memo.push_token`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `user_id` | `uuid` |
| `token` | `text` |
| `platform` | `text` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `memo.setting`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `user_id` | `uuid` |
| `show_impression` | `boolean` |
| `show_action_item` | `boolean` |

#### DB 함수 (15개)

| 함수 | 반환 타입 |
| --- | --- |
| `create_default_categories()` | `trigger` |
| `create_default_memos()` | `trigger` |
| `create_default_user_data()` | `trigger` |
| `get_active_users_stats(include_admin boolean)` | `json` |
| `get_admin_feedback(feedback_id bigint)` | `json` |
| `get_admin_feedbacks(search_query text, page_offset integer, page_limit integer)` | `json` |
| `get_admin_stats(include_admin boolean)` | `json` |
| `get_admin_users(search_query text)` | `json` |
| `get_highlight_counts(target_urls text[])` | `TABLE(url text, count integer)` |
| `get_memo_count()` | `integer` |
| `get_public_stats()` | `json` |
| `get_user_growth(days_ago integer, include_admin boolean)` | `json` |
| `send_welcome_email()` | `trigger` |
| `update_profile_updated_at()` | `trigger` |
| `update_shared_at()` | `trigger` |

### `public`

#### 테이블 `public.countries`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `integer` |
| `name` | `text` |

#### 테이블 `public.table_name`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `inserted_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `data` | `jsonb` |
| `name` | `text` |

#### DB 함수 (2개)

| 함수 | 반환 타입 |
| --- | --- |
| `set_updated_at()` | `trigger` |
| `update_category_memo_count()` | `trigger` |

### `test`

#### 테이블 `test.test-table`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `created_at` | `timestamp with time zone` |

## Supabase 관리 스키마

Supabase가 만들고 관리하는 스키마입니다. 플랫폼 업데이트로 바뀔 수 있습니다.

### `auth`

#### 테이블 `auth.audit_log_entries`

| 컬럼 | 타입 |
| --- | --- |
| `instance_id` | `uuid` |
| `id` | `uuid` |
| `payload` | `json` |
| `created_at` | `timestamp with time zone` |
| `ip_address` | `character varying(64)` |

#### 테이블 `auth.custom_oauth_providers`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `provider_type` | `text` |
| `identifier` | `text` |
| `name` | `text` |
| `client_id` | `text` |
| `client_secret` | `text` |
| `acceptable_client_ids` | `text[]` |
| `scopes` | `text[]` |
| `pkce_enabled` | `boolean` |
| `attribute_mapping` | `jsonb` |
| `authorization_params` | `jsonb` |
| `enabled` | `boolean` |
| `email_optional` | `boolean` |
| `issuer` | `text` |
| `discovery_url` | `text` |
| `skip_nonce_check` | `boolean` |
| `cached_discovery` | `jsonb` |
| `discovery_cached_at` | `timestamp with time zone` |
| `authorization_url` | `text` |
| `token_url` | `text` |
| `userinfo_url` | `text` |
| `jwks_uri` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `custom_claims_allowlist` | `text[]` |

#### 테이블 `auth.flow_state`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `auth_code` | `text` |
| `code_challenge_method` | `auth.code_challenge_method` |
| `code_challenge` | `text` |
| `provider_type` | `text` |
| `provider_access_token` | `text` |
| `provider_refresh_token` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `authentication_method` | `text` |
| `auth_code_issued_at` | `timestamp with time zone` |
| `invite_token` | `text` |
| `referrer` | `text` |
| `oauth_client_state_id` | `uuid` |
| `linking_target_id` | `uuid` |
| `email_optional` | `boolean` |

#### 테이블 `auth.identities`

| 컬럼 | 타입 |
| --- | --- |
| `provider_id` | `text` |
| `user_id` | `uuid` |
| `identity_data` | `jsonb` |
| `provider` | `text` |
| `last_sign_in_at` | `timestamp with time zone` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `email` | `text` |
| `id` | `uuid` |

#### 테이블 `auth.instances`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `uuid` | `uuid` |
| `raw_base_config` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `auth.mfa_amr_claims`

| 컬럼 | 타입 |
| --- | --- |
| `session_id` | `uuid` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `authentication_method` | `text` |
| `id` | `uuid` |

#### 테이블 `auth.mfa_challenges`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `factor_id` | `uuid` |
| `created_at` | `timestamp with time zone` |
| `verified_at` | `timestamp with time zone` |
| `ip_address` | `inet` |
| `otp_code` | `text` |
| `web_authn_session_data` | `jsonb` |

#### 테이블 `auth.mfa_factors`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `friendly_name` | `text` |
| `factor_type` | `auth.factor_type` |
| `status` | `auth.factor_status` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `secret` | `text` |
| `phone` | `text` |
| `last_challenged_at` | `timestamp with time zone` |
| `web_authn_credential` | `jsonb` |
| `web_authn_aaguid` | `uuid` |
| `last_webauthn_challenge_data` | `jsonb` |

#### 테이블 `auth.mfa_recovery_code_sets`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `mfa_factor_id` | `uuid` |
| `failed_verification_count` | `integer` |
| `verification_locked_until` | `timestamp with time zone` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `auth.mfa_recovery_codes`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `mfa_recovery_code_set_id` | `uuid` |
| `code_hash` | `text` |
| `consumed_at` | `timestamp with time zone` |
| `created_at` | `timestamp with time zone` |

#### 테이블 `auth.oauth_authorizations`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `authorization_id` | `text` |
| `client_id` | `uuid` |
| `user_id` | `uuid` |
| `redirect_uri` | `text` |
| `scope` | `text` |
| `state` | `text` |
| `resource` | `text` |
| `code_challenge` | `text` |
| `code_challenge_method` | `auth.code_challenge_method` |
| `response_type` | `auth.oauth_response_type` |
| `status` | `auth.oauth_authorization_status` |
| `authorization_code` | `text` |
| `created_at` | `timestamp with time zone` |
| `expires_at` | `timestamp with time zone` |
| `approved_at` | `timestamp with time zone` |
| `nonce` | `text` |

#### 테이블 `auth.oauth_client_states`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `provider_type` | `text` |
| `code_verifier` | `text` |
| `created_at` | `timestamp with time zone` |

#### 테이블 `auth.oauth_clients`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `client_secret_hash` | `text` |
| `registration_type` | `auth.oauth_registration_type` |
| `redirect_uris` | `text` |
| `grant_types` | `text` |
| `client_name` | `text` |
| `client_uri` | `text` |
| `logo_uri` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `deleted_at` | `timestamp with time zone` |
| `client_type` | `auth.oauth_client_type` |
| `token_endpoint_auth_method` | `text` |

#### 테이블 `auth.oauth_consents`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `client_id` | `uuid` |
| `scopes` | `text` |
| `granted_at` | `timestamp with time zone` |
| `revoked_at` | `timestamp with time zone` |

#### 테이블 `auth.one_time_tokens`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `token_type` | `auth.one_time_token_type` |
| `token_hash` | `text` |
| `relates_to` | `text` |
| `created_at` | `timestamp without time zone` |
| `updated_at` | `timestamp without time zone` |
| `expires_at` | `timestamp with time zone` |

#### 테이블 `auth.refresh_tokens`

| 컬럼 | 타입 |
| --- | --- |
| `instance_id` | `uuid` |
| `id` | `bigint` |
| `token` | `character varying(255)` |
| `user_id` | `character varying(255)` |
| `revoked` | `boolean` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `parent` | `character varying(255)` |
| `session_id` | `uuid` |

#### 테이블 `auth.saml_providers`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `sso_provider_id` | `uuid` |
| `entity_id` | `text` |
| `metadata_xml` | `text` |
| `metadata_url` | `text` |
| `attribute_mapping` | `jsonb` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `name_id_format` | `text` |

#### 테이블 `auth.saml_relay_states`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `sso_provider_id` | `uuid` |
| `request_id` | `text` |
| `for_email` | `text` |
| `redirect_to` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `flow_state_id` | `uuid` |

#### 테이블 `auth.schema_migrations`

| 컬럼 | 타입 |
| --- | --- |
| `version` | `character varying(255)` |

#### 테이블 `auth.scim_tokens`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `sso_provider_id` | `uuid` |
| `token_hash` | `text` |
| `prefix` | `text` |
| `created_at` | `timestamp with time zone` |
| `expires_at` | `timestamp with time zone` |
| `revoked_at` | `timestamp with time zone` |
| `last_used_at` | `timestamp with time zone` |

#### 테이블 `auth.scim_users`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `sso_provider_id` | `uuid` |
| `user_id` | `uuid` |
| `resource` | `jsonb` |
| `user_name` | `text` |
| `external_id` | `text` |
| `active` | `boolean` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `deleted_at` | `timestamp with time zone` |

#### 테이블 `auth.sessions`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `factor_id` | `uuid` |
| `aal` | `auth.aal_level` |
| `not_after` | `timestamp with time zone` |
| `refreshed_at` | `timestamp without time zone` |
| `user_agent` | `text` |
| `ip` | `inet` |
| `tag` | `text` |
| `oauth_client_id` | `uuid` |
| `refresh_token_hmac_key` | `text` |
| `refresh_token_counter` | `bigint` |
| `scopes` | `text` |

#### 테이블 `auth.sso_domains`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `sso_provider_id` | `uuid` |
| `domain` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `auth.sso_providers`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `resource_id` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `disabled` | `boolean` |

#### 테이블 `auth.users`

| 컬럼 | 타입 |
| --- | --- |
| `instance_id` | `uuid` |
| `id` | `uuid` |
| `aud` | `character varying(255)` |
| `role` | `character varying(255)` |
| `email` | `character varying(255)` |
| `encrypted_password` | `character varying(255)` |
| `email_confirmed_at` | `timestamp with time zone` |
| `invited_at` | `timestamp with time zone` |
| `confirmation_token` | `character varying(255)` |
| `confirmation_sent_at` | `timestamp with time zone` |
| `recovery_token` | `character varying(255)` |
| `recovery_sent_at` | `timestamp with time zone` |
| `email_change_token_new` | `character varying(255)` |
| `email_change` | `character varying(255)` |
| `email_change_sent_at` | `timestamp with time zone` |
| `last_sign_in_at` | `timestamp with time zone` |
| `raw_app_meta_data` | `jsonb` |
| `raw_user_meta_data` | `jsonb` |
| `is_super_admin` | `boolean` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `phone` | `text` |
| `phone_confirmed_at` | `timestamp with time zone` |
| `phone_change` | `text` |
| `phone_change_token` | `character varying(255)` |
| `phone_change_sent_at` | `timestamp with time zone` |
| `confirmed_at` | `timestamp with time zone` |
| `email_change_token_current` | `character varying(255)` |
| `email_change_confirm_status` | `smallint` |
| `banned_until` | `timestamp with time zone` |
| `reauthentication_token` | `character varying(255)` |
| `reauthentication_sent_at` | `timestamp with time zone` |
| `is_sso_user` | `boolean` |
| `deleted_at` | `timestamp with time zone` |
| `is_anonymous` | `boolean` |
| `share_mode` | `character varying(20)` |

#### 테이블 `auth.webauthn_challenges`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `challenge_type` | `text` |
| `session_data` | `jsonb` |
| `created_at` | `timestamp with time zone` |
| `expires_at` | `timestamp with time zone` |

#### 테이블 `auth.webauthn_credentials`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `user_id` | `uuid` |
| `credential_id` | `bytea` |
| `public_key` | `bytea` |
| `attestation_type` | `text` |
| `aaguid` | `uuid` |
| `sign_count` | `bigint` |
| `transports` | `jsonb` |
| `backup_eligible` | `boolean` |
| `backed_up` | `boolean` |
| `friendly_name` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `last_used_at` | `timestamp with time zone` |

#### DB 함수 (4개)

| 함수 | 반환 타입 |
| --- | --- |
| `email()` | `text` |
| `jwt()` | `jsonb` |
| `role()` | `text` |
| `uid()` | `uuid` |

### `cron`

#### 테이블 `cron.job`

| 컬럼 | 타입 |
| --- | --- |
| `jobid` | `bigint` |
| `schedule` | `text` |
| `command` | `text` |
| `nodename` | `text` |
| `nodeport` | `integer` |
| `database` | `text` |
| `username` | `text` |
| `active` | `boolean` |
| `jobname` | `text` |

#### 테이블 `cron.job_run_details`

| 컬럼 | 타입 |
| --- | --- |
| `jobid` | `bigint` |
| `runid` | `bigint` |
| `job_pid` | `integer` |
| `database` | `text` |
| `username` | `text` |
| `command` | `text` |
| `status` | `text` |
| `return_message` | `text` |
| `start_time` | `timestamp with time zone` |
| `end_time` | `timestamp with time zone` |

### `extensions`

#### DB 함수 (6개)

| 함수 | 반환 타입 |
| --- | --- |
| `grant_pg_cron_access()` | `event_trigger` |
| `grant_pg_graphql_access()` | `event_trigger` |
| `grant_pg_net_access()` | `event_trigger` |
| `pgrst_ddl_watch()` | `event_trigger` |
| `pgrst_drop_watch()` | `event_trigger` |
| `set_graphql_placeholder()` | `event_trigger` |

### `graphql`

테이블과 DB 함수가 없습니다.

### `graphql_public`

#### DB 함수 (1개)

| 함수 | 반환 타입 |
| --- | --- |
| `graphql("operationName" text, query text, variables jsonb, extensions jsonb)` | `jsonb` |

### `net`

#### 테이블 `net._http_response`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `status_code` | `integer` |
| `content_type` | `text` |
| `headers` | `jsonb` |
| `content` | `text` |
| `timed_out` | `boolean` |
| `error_msg` | `text` |
| `created` | `timestamp with time zone` |

#### 테이블 `net.http_request_queue`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `method` | `net.http_method` |
| `url` | `text` |
| `headers` | `jsonb` |
| `body` | `bytea` |
| `timeout_milliseconds` | `integer` |

### `pgbouncer`

#### DB 함수 (1개)

| 함수 | 반환 타입 |
| --- | --- |
| `get_auth(p_usename text)` | `TABLE(username text, password text)` |

### `pgsodium`

#### 테이블 `pgsodium.key`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `status` | `pgsodium.key_status` |
| `created` | `timestamp with time zone` |
| `expires` | `timestamp with time zone` |
| `key_type` | `pgsodium.key_type` |
| `key_id` | `bigint` |
| `key_context` | `bytea` |
| `name` | `text` |
| `associated_data` | `text` |
| `raw_key` | `bytea` |
| `raw_key_nonce` | `bytea` |
| `parent_key` | `uuid` |
| `comment` | `text` |
| `user_data` | `text` |

### `pgsodium_masks`

테이블과 DB 함수가 없습니다.

### `realtime`

#### 테이블 `realtime.messages`

| 컬럼 | 타입 |
| --- | --- |
| `topic` | `text` |
| `extension` | `text` |
| `payload` | `jsonb` |
| `event` | `text` |
| `private` | `boolean` |
| `updated_at` | `timestamp without time zone` |
| `inserted_at` | `timestamp without time zone` |
| `id` | `uuid` |
| `binary_payload` | `bytea` |
| `skip_broadcast` | `boolean` |

#### 테이블 `realtime.schema_migrations`

| 컬럼 | 타입 |
| --- | --- |
| `version` | `bigint` |
| `inserted_at` | `timestamp(0) without time zone` |

#### 테이블 `realtime.subscription`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `subscription_id` | `uuid` |
| `entity` | `regclass` |
| `filters` | `realtime.user_defined_filter[]` |
| `claims` | `jsonb` |
| `claims_role` | `regrole` |
| `created_at` | `timestamp without time zone` |
| `action_filter` | `text` |
| `selected_columns` | `text[]` |

#### DB 함수 (15개)

| 함수 | 반환 타입 |
| --- | --- |
| `apply_rls(wal jsonb, max_record_bytes integer)` | `SETOF realtime.wal_rls` |
| `broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text)` | `void` |
| `build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])` | `text` |
| `cast(val text, type_ regtype)` | `jsonb` |
| `check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)` | `boolean` |
| `check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean)` | `boolean` |
| `is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])` | `boolean` |
| `list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)` | `TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)` |
| `quote_wal2json(entity regclass)` | `text` |
| `send(payload jsonb, event text, topic text, private boolean)` | `void` |
| `send_binary(payload bytea, event text, topic text, private boolean)` | `void` |
| `subscription_check_filters()` | `trigger` |
| `to_regrole(role_name text)` | `regrole` |
| `topic()` | `text` |
| `wal2json_escape_identifier(name text)` | `text` |

### `storage`

#### 테이블 `storage.buckets`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `text` |
| `name` | `text` |
| `owner` | `uuid` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `public` | `boolean` |
| `avif_autodetection` | `boolean` |
| `file_size_limit` | `bigint` |
| `allowed_mime_types` | `text[]` |
| `owner_id` | `text` |
| `type` | `storage.buckettype` |
| `versioning_status` | `text` |
| `lifecycle_configuration` | `jsonb` |
| `lifecycle_configuration_generation` | `uuid` |

#### 테이블 `storage.buckets_analytics`

| 컬럼 | 타입 |
| --- | --- |
| `name` | `text` |
| `type` | `storage.buckettype` |
| `format` | `text` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `id` | `uuid` |
| `deleted_at` | `timestamp with time zone` |

#### 테이블 `storage.buckets_vectors`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `text` |
| `type` | `storage.buckettype` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### 테이블 `storage.migrations`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `integer` |
| `name` | `character varying(100)` |
| `hash` | `character varying(40)` |
| `executed_at` | `timestamp without time zone` |

#### 테이블 `storage.objects`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `bucket_id` | `text` |
| `name` | `text` |
| `owner` | `uuid` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |
| `last_accessed_at` | `timestamp with time zone` |
| `metadata` | `jsonb` |
| `path_tokens` | `text[]` |
| `version` | `text` |
| `owner_id` | `text` |
| `user_metadata` | `jsonb` |
| `archived_at` | `timestamp with time zone` |
| `is_delete_marker` | `boolean` |
| `is_versioned` | `boolean` |

#### 테이블 `storage.s3_multipart_uploads`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `text` |
| `in_progress_size` | `bigint` |
| `upload_signature` | `text` |
| `bucket_id` | `text` |
| `key` | `text` |
| `version` | `text` |
| `owner_id` | `text` |
| `created_at` | `timestamp with time zone` |
| `user_metadata` | `jsonb` |
| `metadata` | `jsonb` |

#### 테이블 `storage.s3_multipart_uploads_parts`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `upload_id` | `text` |
| `size` | `bigint` |
| `part_number` | `integer` |
| `bucket_id` | `text` |
| `key` | `text` |
| `etag` | `text` |
| `owner_id` | `text` |
| `version` | `text` |
| `created_at` | `timestamp with time zone` |

#### 테이블 `storage.vector_indexes`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `text` |
| `name` | `text` |
| `bucket_id` | `text` |
| `data_type` | `text` |
| `dimension` | `integer` |
| `distance_metric` | `text` |
| `metadata_configuration` | `jsonb` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### DB 함수 (19개)

| 함수 | 반환 타입 |
| --- | --- |
| `allow_any_operation(expected_operations text[])` | `boolean` |
| `allow_only_operation(expected_operation text)` | `boolean` |
| `can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)` | `void` |
| `enforce_bucket_lifecycle_service_role()` | `trigger` |
| `enforce_bucket_name_length()` | `trigger` |
| `extension(name text)` | `text` |
| `filename(name text)` | `text` |
| `foldername(name text)` | `text[]` |
| `get_common_prefix(p_key text, p_prefix text, p_delimiter text)` | `text` |
| `get_size_by_bucket(noncurrent_versions text, delete_markers text)` | `TABLE(size bigint, bucket_id text)` |
| `list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text, raw_prefix_param text)` | `TABLE(key text, id text, created_at timestamp with time zone)` |
| `list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text, noncurrent_versions text, delete_markers text, next_token_archived_at timestamp with time zone, next_token_version text)` | `TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)` |
| `operation()` | `text` |
| `protect_bucket_control_columns()` | `trigger` |
| `protect_delete()` | `trigger` |
| `search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text, noncurrent_versions text, delete_markers text)` | `TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)` |
| `search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text, delete_markers text, p_start_after_version text)` | `TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)` |
| `search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text, noncurrent_versions text, delete_markers text, start_after_archived_at timestamp with time zone, start_after_version text, start_after_is_continuation boolean)` | `TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)` |
| `update_updated_at_column()` | `trigger` |

### `supabase_functions`

#### 테이블 `supabase_functions.hooks`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `bigint` |
| `hook_table_id` | `integer` |
| `hook_name` | `text` |
| `created_at` | `timestamp with time zone` |
| `request_id` | `bigint` |

#### 테이블 `supabase_functions.migrations`

| 컬럼 | 타입 |
| --- | --- |
| `version` | `text` |
| `inserted_at` | `timestamp with time zone` |

#### DB 함수 (1개)

| 함수 | 반환 타입 |
| --- | --- |
| `http_request()` | `trigger` |

### `supabase_migrations`

#### 테이블 `supabase_migrations.schema_migrations`

| 컬럼 | 타입 |
| --- | --- |
| `version` | `text` |
| `statements` | `text[]` |
| `name` | `text` |
| `created_by` | `text` |
| `idempotency_key` | `text` |
| `rollback` | `text[]` |

#### 테이블 `supabase_migrations.seed_files`

| 컬럼 | 타입 |
| --- | --- |
| `path` | `text` |
| `hash` | `text` |

### `vault`

#### 테이블 `vault.secrets`

| 컬럼 | 타입 |
| --- | --- |
| `id` | `uuid` |
| `name` | `text` |
| `description` | `text` |
| `secret` | `text` |
| `key_id` | `uuid` |
| `nonce` | `bytea` |
| `created_at` | `timestamp with time zone` |
| `updated_at` | `timestamp with time zone` |

#### DB 함수 (1개)

| 함수 | 반환 타입 |
| --- | --- |
| `secrets_encrypt_secret_secret()` | `trigger` |

## Edge Functions

| 함수 | 배포 버전 |
| --- | --- |
| `daily-article-reminder` | 6 |
| `get-categories-with-count` | 11 |
| `kakao-auth` | 7 |
| `send-feedback` | 5 |
| `send-signup-slack-notification` | 1 |
| `send-welcome-email` | 4 |
