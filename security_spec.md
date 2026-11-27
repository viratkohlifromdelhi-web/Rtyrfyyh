# Security Specification — Visitor Telemetry & Owner Analytics

## 1. Data Invariants
1. **PII Isolation**: `site_visits/{sessionId}` contains visitor IP address, approximate coordinates, city/region/postal, ISP, and device specs. Only the verified owner (`request.auth.token.email == 'viratkohlifromdelhi@gmail.com' && request.auth.token.email_verified == true`) may `get`, `list`, or `delete` any `site_visits` or `events` document.
2. **Write-Only Telemetry**: Unauthenticated birthday site visitors may create a single session document matching `sessionId`, perform strictly allowlisted action-based updates (`heartbeat`, `geoEnrichment`, `batteryOrOrientation`) without mutating immutable identity/timestamp fields (`sessionId`, `visitorId`, `openedAt`, `openedAtMs`), and append `events` under an existing parent `site_visits/{sessionId}` document.
3. **Immutable Audit Trail**: Documents in `site_visits/{sessionId}/events/{eventId}` are strictly append-only (`update` and `delete` denied for everyone).
4. **Temporal & Volumetric Integrity**: `openedAt` and `eventTime` MUST equal `request.time`. Every string field is bounded with explicit `.size()` limits matching `firebase-blueprint.json`, and every document ID is validated with `isValidId()`.

## 2. The "Dirty Dozen" Attack Payloads (All MUST Return PERMISSION_DENIED)
1. **Unauthenticated List Scrape**: Anonymous user runs `getDocs(collection(db, 'site_visits'))` -> DENIED (`isOwner()` fails).
2. **Unauthenticated Subcollection Read**: Anonymous user reads `site_visits/sess_1/events` -> DENIED.
3. **Spoofed Unverified Owner Email**: Auth token has `email: 'viratkohlifromdelhi@gmail.com'` with `email_verified: false` -> DENIED.
4. **Non-Owner Authenticated Read**: Signed-in Google user `other@example.com` (`email_verified: true`) reads `site_visits` -> DENIED.
5. **Shadow / Ghost Field Injection on Create**: Creating `site_visits/sess_1` with extra field `isAdmin: true` -> DENIED (`keys().hasOnly(...)`).
6. **ID Poisoning**: Creating `site_visits/<200-char-invalid-id!@#>` -> DENIED (`isValidId(sessionId)`).
7. **Forged Client Timestamp**: Creating `site_visits/sess_1` with `openedAt` in the past instead of `request.time` -> DENIED.
8. **Immutable Field Hijack on Update**: Updating `site_visits/sess_1` to change `visitorId` or `openedAtMs` -> DENIED.
9. **Value Poisoning on Update**: Updating `maxScrollPct` to `9999` or `"hacked"` -> DENIED (`isValidSiteVisitUpdate`).
10. **Orphaned Event Creation**: Creating `site_visits/nonexistent_session/events/ev_1` -> DENIED (`exists(...)` parent check).
11. **Event Tampering / Deletion**: Updating or deleting an existing `site_visits/sess_1/events/ev_1` -> DENIED (`allow update, delete: if false`).
12. **Denial-of-Wallet Oversized Payload**: Creating an event with a 50KB `elementName` or invalid `eventType` pattern -> DENIED (`.size() <= 160` & regex guard).
