# SMS Fallback Plugin (Bundle B - Initial Implementation)

This document describes the first implementation slice for Bundle B: optional SMS fallback when a WhatsApp recipient is not registered.

## What is implemented

- A built-in extension plugin named `sms-fallback` is registered by the plugin loader.
- The plugin listens to `message:failed` hook and checks for WhatsApp-registration related errors.
- `MessageService.sendText` emits a new `message:fallback` hook when send failure matches registration errors.
- The plugin currently uses a **mock adapter behavior** (logs fallback intent) and does not call external SMS providers yet.

## Current configuration schema

`plugin.id = sms-fallback`

- `enabled` (boolean, default `false`)
- `provider` (string, default `mock`)
- `apiKey` (string, secret)
- `from` (string)

## Scope and limitations

- This first slice only wires the fallback contract and observability path.
- Provider integration (Twilio, Vonage, etc.), retries, and delivery receipts are out of scope for this commit.
- Fallback signal is currently emitted for `sendText` flow.

## Next steps

1. Add provider adapter interface and implementation(s).
2. Extend fallback trigger coverage to media/other outbound flows as needed.
3. Add dashboard controls for fallback policy and credential management.
4. Add metrics counters for attempted/success/failed fallback sends.
