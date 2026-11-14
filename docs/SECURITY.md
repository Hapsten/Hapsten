# Security review

Scope: the matchmaking build (phases 0–4) — Firestore rules, the matchmaker Cloud
Function, the Firebase client configuration and the data the app writes. Payment is out of
scope, and there is no Storage/upload flow yet.

The security boundary for this app is **`firestore.rules`**. The client is untrusted: anyone
can extract the Firebase config from an APK and call the REST API directly, so every write
below is validated server-side.

## Findings and fixes

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Any signed-in user could read **every profile**, including email, home coordinates (`homeGeo`) and Expo push tokens. | High | Fixed — profiles are owner-only |
| 2 | Any signed-in user could read **every event**, including private squads formed by the matchmaker. | High | Fixed — open events or members only |
| 3 | Chat read access trusted `chats.participants`, a cached copy of the event roster. A stale copy kept a departed player in the room. | Medium | Fixed — message access is derived from `events.participantIds` |
| 4 | Event and chat membership could drift: a client could change the event without touching the chat (or vice versa), leaving a player with chat access to a plan they left, or in a room alone. | Medium | Fixed — a chat's participants must equal the event's post-write roster (`getAfter`) |
| 5 | Intent documents were unvalidated, so a client could write a non-timestamp `startAt`, `NaN`/out-of-range geo, a 10 000 km radius, or an unknown sport. The matchmaker then crashed or mis-grouped (DoS). | High | Fixed — rules validate the shape; `toIntent()` re-validates before use |
| 6 | A client could set `status: 'matched'` and `eventId` on its own intent, faking membership in a squad it was never matched into. | Medium | Fixed — clients may only `cancelled` |
| 7 | Event status/venue were unconstrained: a member could point `venueId` at a non-existent venue, fake a venue name, or cancel/complete a populated plan. | Medium | Fixed — status whitelist, host-only cancel, venue existence + name match |
| 8 | A member could write `lastReadAt.<someone-else>`, marking messages read for another user. | Low | Fixed — a member may only write their own key |
| 9 | Any member could post an arbitrary `system` message ("Pay ₹500 to confirm"), which the UI renders as a trusted system notice. | Medium | Fixed — system messages must match a fixed template |
| 10 | A chat could be created without an event, with an arbitrary participant list. | Medium | Fixed — chat creation requires a matching event created by the caller |
| 11 | Profile identity/trust fields (`uid`, `email`, `reliabilityScore`, `createdAt`) were writable by the owner. | Medium | Fixed — update whitelist excludes them |
| 12 | `expoPushToken` was unbounded and could be any string, which the matchmaker forwarded to Expo. | Low | Fixed — ≤ 200 chars and must start with `Expo` |
| 13 | Dead client helper `ensureEventChat()` could rewrite a chat's participant list (rules would now reject it). | Low | Removed |
| 14 | No App Check, no rate limiting, no email-verification requirement. | Medium | **Open** — see below |
| 15 | Dependency advisories (`@grpc/grpc-js`, `zod`, `glob`, `minimatch`, `node-forge`, `deepmerge`). | Medium | **Open** — see below |

## What the rules enforce now

- **`users/{uid}`** — owner-only read/write. Create must write a complete profile; update may
  only touch `displayName`, `photoURL`, `sports`, `skillLevel`, `homeGeo`, `homeGeohash`,
  `homeLabel`, `expoPushToken`, `updatedAt`. Email, `reliabilityScore` and `createdAt` are
  immutable from the client. Deletes are denied.
- **`intents/{id}`** — owner-only read. Create validates sport, a real timestamp window
  (future, ≤ 12 h, `expiresAt == startAt`), geo type, geohash, area label, radius 1–50 km,
  skill, `status: 'searching'`, `eventId: null`. Update may only set `status: 'cancelled'`.
  `matched`/`expired` come from the Admin SDK, which bypasses rules.
- **`events/{id}`** — read if `isOpen == true` or the caller is in `participantIds`.
  Create is open-plan only: caller is creator and sole participant, valid time window,
  capacity ≤ 50, `status: 'forming'`, `venueId/venueName/matchKey` null. Update allows either
  (a) a member changing their own membership plus status/venue, or (b) a newcomer adding only
  themselves to an open plan within capacity. Nobody can remove another player, rewrite the
  creator, or exceed capacity.
- **`chats/{eventId}`** — read if the caller is a cached participant (keeps the
  `array-contains` chat-list query working). Create must mirror a matching event
  (`participantIds == [uid]`, `chatId`, `createdBy`). Update is either a metadata/read-receipt
  change or a membership change that exactly mirrors the event's post-write roster and only
  touches the caller's own entry.
- **`chats/{eventId}/messages/{id}`** — read/create require membership in the **event** (not
  the cached chat roster). `senderId`, `id` and `chatId` must match, `createdAt` must be
  server time, content ≤ 2000 chars, and `system` messages must match a known template.
  Messages are immutable.
- **`venues/{id}`** — readable by signed-in users, writable only by the Admin SDK/console.

### Why `getAfter` runs in one direction only

The chat document validates its participants against the event's **post-write** state
(`getAfter`), which makes "join/leave the event and the chat in one batch" atomic. The event
rules deliberately do **not** inspect the chat: two rules that each `getAfter` the other
deadlock in the emulator, and a rejected write then produces a circular evaluation error
instead of a clean denial. Authorization never depends on the chat copy, so a client that
skips the chat update only loses its own chat metadata, not message access.

### GeoPoint validation

Rules cannot read `latlng` components (`geo.latitude` is a type error — verified against the
emulator), so the rules assert `geo is latlng` only. The Firebase SDKs reject out-of-range
coordinates when a `GeoPoint` is constructed, and `toIntent()` in the matchmaker re-checks
finite ranges and the radius before matching.

## Residual risks and operational hardening

These cannot be fixed in `firestore.rules` and need console/CLI action:

1. **App Check.** Enable App Check for Firestore and Cloud Functions (Play Integrity on
   Android, App Attest/DeviceCheck on iOS, reCAPTCHA Enterprise on web) and turn on
   enforcement. Without it, anyone with the public Firebase config can call the API from a
   script. The app has no App Check initialization yet.
2. **API key restrictions.** The key in `src/firebase/config.ts` is a public client key (that
   is expected — it is not a secret), but it must be restricted in Google Cloud: application
   restrictions (Android package name + SHA-1, iOS bundle id, web referrers) and API
   restrictions (Identity Toolkit + Cloud Firestore only). `src/firebase/config.ts` is
   gitignored; `config.example.ts` documents the shape. The web `appId` is still a placeholder.
3. **Email verification.** Sign-up accepts any address without verification. Consider
   requiring `email_verified` (custom claims + rules check) before posting intents.
4. **Rate limiting / abuse.** Rules cannot throttle. Use App Check quotas, Cloud Billing
   budget alerts, and Firestore usage alerts. If intent spam appears, move intent creation to
   a callable that rate-limits per uid. There is also no cap on how many events one user can
   host.
5. **Email in Firestore.** `users.email` duplicates the Auth record. It is only used for the
   profile screen; it could be dropped from Firestore entirely to reduce blast radius.
6. **No public profile projection.** Because profiles are private, the UI cannot show other
   players' names or avatars. If that is needed later, add a separate
   `publicProfiles/{uid}` document containing only display name, photo and sports — never
   email, home coordinates or push tokens.
7. **Dependency advisories.** `npm audit --omit=dev` reports 15 advisories (6 high, 8 moderate,
   1 low) in Expo/React Native tooling and `@grpc/grpc-js`/`zod`. None are known-exploitable in
   this app's usage, but they should be cleared by upgrading Expo SDK patch versions with
   `npx expo install --fix` and re-running `npx expo-doctor`. `@firebase/rules-unit-testing` is
   a dev-only dependency and is not bundled into the app.
8. **No backups.** Enable Firestore point-in-time recovery and export schedules before launch.
9. **Storage.** No `storage.rules` exists because uploads are not implemented. Add deny-by-default
   Storage rules before image messages ship.

## Tests

`tests/firestore-rules.test.mjs` runs 53 assertions against the real rules file in the
Firestore emulator: privacy of profiles/events/messages, intent validation, event/chat
membership atomicity, capacity limits, read-receipt and system-message spoofing, venue
integrity, and the exact queries the list screens use.

```bash
npm run test:rules
```

Requirements: Java 11+ and network access on first run (the emulator downloads itself).
The emulator project id is `demo-hapsteen`; nothing touches the real project.

## Deployment checklist

```bash
npm run typecheck
npx expo lint
npm run test:rules
npm --prefix functions run build
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

Then, in the console: enable + enforce App Check, restrict the API key, enable PITR/backups,
and set budget/usage alerts.
