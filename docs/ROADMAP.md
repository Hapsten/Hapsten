# Hapsteen Roadmap

Status of the matchmaking build. Payment is intentionally **out of scope** for now.

## Phase overview

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Domain model, sport catalog, geo/time helpers, Firestore rules & indexes, profile bootstrap | Code written, not deployed |
| 1 | Real "find a squad" intent flow (GPS, sport, day, time, radius, skill) + live search map | Code written, not run on a device |
| 2 | Matchmaker Cloud Function: groups compatible intents into an event + chat | Code written, not deployed |
| 3 | Event chat: one deterministic chat per event, system messages, read state | Code written, not run on a device |
| 4 | Venue suggestion hook + picker screen | Code written; venue data not seeded |
| 5 | Booking + payment | **Deferred by request** |

## Data model

All types live in `src/types/models.ts`.

- `users/{uid}` — profile, home location, sports, skill, Expo push token, reliability score.
- `intents/{id}` — one active "looking for players" post. Fields: sport, `startAt`, `endAt`,
  geo + geohash, radius, skill, `status`, `eventId`, `expiresAt`.
- `events/{id}` — a squad plan. `participantIds`, `capacity`, `minPlayers`, `status`,
  `isOpen`, `source` (`open` | `match`), `chatId`, optional venue.
- `chats/{eventId}` — **the chat id is the event id**, so a plan can never have two chats.
  `lastReadAt` is a per-user timestamp map.
- `chats/{eventId}/messages/{id}` — `text` | `image` | `system` messages.
- `venues/{id}` — curated courts. Read-only from the app.

### Intent lifecycle

`searching` → `matched` (matchmaker) or `cancelled` (user) or `expired` (start time passed).

### Search screen map

The "Finding your squad" screen draws the intent's own centre and radius on a map, with a
recenter button. It intentionally shows **only the caller's search circle** — other players'
locations are never exposed.

### Matching rules (Cloud Function)

Two intents match when:

1. Same sport.
2. Skill is compatible (`any` matches everything).
3. Their time windows overlap by at least **45 minutes**.
4. Distance between them is within the **smaller** of the two search radii.

A squad is created once at least `minPlayers` compatible intents exist. The event window is
the overlapping portion, and the event location is the midpoint of the members.

The event id is a hash of the sorted member uids + sport + start time, so a retried function
run cannot create a duplicate squad.

## Chat behaviour

- `chatId === eventId` everywhere.
- Joining or leaving writes a `system` message.
- Read receipts use `chats.lastReadAt[uid]` instead of rewriting every message.
- Messages are ordered by `createdAt`; a query on `clientCreatedAt` would silently drop
  documents that do not have that field (matchmaker messages), so it is not used.

## Firestore rules summary (`firestore.rules`)

The rules are the security boundary; see [`SECURITY.md`](./SECURITY.md) for the full model,
the fixed findings and the remaining operational work.

- Profiles: private to their owner (email, home coordinates and push tokens never leak).
- Intents: owner-only; clients can only create a valid `searching` intent and cancel it.
  `matched`/`expired` are written by the Admin SDK.
- Events: open plans are readable by signed-in users, private squads only by members.
  Clients can only create open plans, join/leave themselves, stay within capacity, and pick a
  real venue.
- Chats: readable by their cached participants; participants must mirror the event roster.
- Messages: read/write require membership in the **event**, senders cannot be spoofed, and
  system messages must match a fixed template.
- Venues: read-only from the app (Admin SDK / console writes).

Deploy them with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Run the rule tests (Firestore emulator, no project access needed):

```bash
npm run test:rules
```

## Cloud Functions (`functions/`)

Two scheduled jobs (region `asia-south1`, time zone `Asia/Kolkata`):

- `matchIntents` — every minute, scans searching intents in the next 24 hours and forms squads.
- `expireIntents` — every 5 minutes, marks intents whose window has started as `expired`.

The matchmaker sends an Expo push to participants that have an `expoPushToken`. Push is
best-effort and never rolls back a created squad.

## Setup

Node.js is **not installed on this machine**, so none of the commands below have been run yet.

```bash
# 1. Install Node.js 22 LTS, then from the repo root:
npm install                     # installs expo-location too
npx expo install expo-location  # only if npm install did not resolve it

# 2. Checks
npx tsc --noEmit
npx expo lint

# 3. Firebase
npm --prefix functions install
npm --prefix functions run build
firebase login
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

`firebase.json` and `.firebaserc` point at project `hapsten-bck`.

### Venue data

The picker reads the `venues` collection. Add documents manually (console or Admin SDK) with
this shape:

```json
{
  "name": "Example Sports Arena",
  "address": "Street, Area, City",
  "geo": { "_latitude": 22.57, "_longitude": 88.36 },
  "geohash": "tu4v...",
  "sports": ["badminton", "pickleball"],
  "courts": 4,
  "pricePerHour": 600,
  "currency": "INR",
  "rating": 4.5,
  "photoUrl": null
}
```

`geo` must be a real Firestore `GeoPoint` (the console "geopoint" field type), not a plain map.

## Known gaps

- App Check, API-key restrictions, email verification and rate limiting are not enabled yet —
  see [`SECURITY.md`](./SECURITY.md) for the hardening checklist.
- The home screen still shows demo "happening nearby" cards; it is not wired to Firestore yet.
- The matchmaker only forms a squad when enough intents are searching **at the same run**;
  a lone player waits until others join before the start time.
- The client does not register an Expo push token yet. Push needs `expo-notifications` and a
  development build on Android, so the matchmaker's push is a no-op until that is added.
- Venue slots, booking holds and payments are not implemented.
- `app.json` still needs a real web `appId` in `src/firebase/config.ts` if web builds are used.
- Nothing has been committed; all changes are on the working tree of `feat/matching-foundation`.
