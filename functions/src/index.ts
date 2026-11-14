import { createHash } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  GeoPoint,
  Timestamp,
  getFirestore,
  type DocumentData,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { distanceKm, midpoint, type LatLng } from './geo';

initializeApp();

const db = getFirestore();

/** All scheduled jobs run on the app's primary region. */
const REGION = 'asia-south1';
const TIME_ZONE = 'Asia/Kolkata';

/** Two intents must share at least this much play time. */
const MIN_OVERLAP_MIN = 45;
/** How far ahead the matcher looks for intents. */
const MATCH_HORIZON_MS = 24 * 60 * 60 * 1000;
const MAX_INTENTS_PER_RUN = 400;

type SportId = 'badminton' | 'tennis' | 'football' | 'basketball' | 'cricket' | 'pickleball';
type SkillLevel = 'any' | 'beginner' | 'intermediate' | 'advanced';

type SportConfig = {
  id: SportId;
  label: string;
  minPlayers: number;
  capacity: number;
};

const SPORTS: Record<SportId, SportConfig> = {
  badminton: { id: 'badminton', label: 'Badminton', minPlayers: 2, capacity: 4 },
  tennis: { id: 'tennis', label: 'Tennis', minPlayers: 2, capacity: 4 },
  football: { id: 'football', label: 'Football', minPlayers: 6, capacity: 10 },
  basketball: { id: 'basketball', label: 'Basketball', minPlayers: 6, capacity: 10 },
  cricket: { id: 'cricket', label: 'Cricket', minPlayers: 8, capacity: 12 },
  pickleball: { id: 'pickleball', label: 'Pickleball', minPlayers: 2, capacity: 4 },
};

type IntentRecord = {
  id: string;
  uid: string;
  sport: SportId;
  startAt: Timestamp;
  endAt: Timestamp;
  geo: LatLng;
  radiusKm: number;
  skillLevel: SkillLevel;
  areaLabel: string;
};

/**
 * Groups open intents into squads. Runs every minute; each run is cheap because
 * it only reads intents inside the next 24 hours that are still searching.
 */
export const matchIntents = onSchedule(
  {
    schedule: '* * * * *',
    region: REGION,
    timeZone: TIME_ZONE,
    timeoutSeconds: 120,
  },
  async () => {
    const now = Date.now();
    const horizon = Timestamp.fromMillis(now + MATCH_HORIZON_MS);

    // status + startAt is backed by firestore.indexes.json.
    const snapshot = await db
      .collection('intents')
      .where('status', '==', 'searching')
      .where('startAt', '<=', horizon)
      .orderBy('startAt', 'asc')
      .limit(MAX_INTENTS_PER_RUN)
      .get();

    const intents: IntentRecord[] = snapshot.docs
      .map((doc) => toIntent(doc.id, doc.data()))
      .filter((intent): intent is IntentRecord => intent !== null)
      .filter((intent) => intent.startAt.toMillis() > now);

    const claimed = new Set<string>();
    let matchesCreated = 0;

    for (const seed of intents) {
      if (claimed.has(seed.id)) continue;

      const sport = SPORTS[seed.sport];
      if (!sport) continue;

      const cluster: IntentRecord[] = [seed];
      claimed.add(seed.id);

      // Track the running intersection so every member can actually play.
      let windowStart = seed.startAt.toMillis();
      let windowEnd = seed.endAt.toMillis();

      for (const candidate of intents) {
        if (cluster.length >= sport.capacity) break;
        if (claimed.has(candidate.id)) continue;
        if (!isCompatible(seed, candidate)) continue;

        const nextStart = Math.max(windowStart, candidate.startAt.toMillis());
        const nextEnd = Math.min(windowEnd, candidate.endAt.toMillis());
        if (nextEnd - nextStart < MIN_OVERLAP_MIN * 60_000) continue;

        windowStart = nextStart;
        windowEnd = nextEnd;
        cluster.push(candidate);
        claimed.add(candidate.id);
      }

      if (cluster.length < sport.minPlayers) {
        // Not enough players yet. Release them so a later run can retry.
        cluster.forEach((intent) => claimed.delete(intent.id));
        continue;
      }

      try {
        await createMatch(cluster, sport);
        matchesCreated += 1;
      } catch (error) {
        logger.error('Failed to create match', { sport: sport.id, error });
        cluster.forEach((intent) => claimed.delete(intent.id));
      }
    }

    if (matchesCreated > 0) {
      logger.info('Matchmaker run finished', { matchesCreated, scanned: intents.length });
    }
  },
);

/** Cleans up intents whose window has already started. */
export const expireIntents = onSchedule(
  {
    schedule: '*/5 * * * *',
    region: REGION,
    timeZone: TIME_ZONE,
  },
  async () => {
    const snapshot = await db
      .collection('intents')
      .where('status', '==', 'searching')
      .where('expiresAt', '<=', Timestamp.now())
      .limit(400)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'expired', updatedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();

    logger.info('Expired stale intents', { count: snapshot.size });
  },
);

function toIntent(id: string, data: DocumentData): IntentRecord | null {
  if (typeof data.uid !== 'string' || data.uid.length === 0) return null;
  if (typeof data.sport !== 'string' || !Object.prototype.hasOwnProperty.call(SPORTS, data.sport)) {
    return null;
  }

  const startAt = data.startAt;
  const endAt = data.endAt;
  if (!(startAt instanceof Timestamp) || !(endAt instanceof Timestamp)) return null;
  if (endAt.toMillis() <= startAt.toMillis()) return null;
  // The rules cap windows at 12 hours; reject anything malformed that got past them.
  if (endAt.toMillis() - startAt.toMillis() > 12 * 60 * 60 * 1000) return null;

  const geo = data.geo as { latitude?: unknown; longitude?: unknown } | undefined;
  if (!geo || typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') return null;
  if (!Number.isFinite(geo.latitude) || !Number.isFinite(geo.longitude)) return null;
  if (geo.latitude < -90 || geo.latitude > 90) return null;
  if (geo.longitude < -180 || geo.longitude > 180) return null;

  const radiusKm = data.radiusKm;
  if (typeof radiusKm !== 'number' || !Number.isFinite(radiusKm)) return null;
  if (radiusKm <= 0 || radiusKm > 50) return null;

  const skillLevel = data.skillLevel;
  if (
    skillLevel !== undefined &&
    skillLevel !== 'any' &&
    skillLevel !== 'beginner' &&
    skillLevel !== 'intermediate' &&
    skillLevel !== 'advanced'
  ) {
    return null;
  }

  const areaLabel =
    typeof data.areaLabel === 'string' ? data.areaLabel.slice(0, 200) : 'Nearby';

  return {
    id,
    uid: data.uid,
    sport: data.sport as SportId,
    startAt,
    endAt,
    geo: { latitude: geo.latitude, longitude: geo.longitude },
    radiusKm,
    skillLevel: (skillLevel as SkillLevel) ?? 'any',
    areaLabel,
  };
}

function isCompatible(a: IntentRecord, b: IntentRecord): boolean {
  if (a.uid === b.uid) return false;
  if (a.sport !== b.sport) return false;

  const skillsMatch =
    a.skillLevel === 'any' || b.skillLevel === 'any' || a.skillLevel === b.skillLevel;
  if (!skillsMatch) return false;

  if (overlapMinutes(a, b) < MIN_OVERLAP_MIN) return false;

  // Both players must be inside the tighter of the two search radii.
  const allowedKm = Math.min(a.radiusKm, b.radiusKm);
  return distanceKm(a.geo, b.geo) <= allowedKm;
}

function overlapMinutes(a: IntentRecord, b: IntentRecord): number {
  const start = Math.max(a.startAt.toMillis(), b.startAt.toMillis());
  const end = Math.min(a.endAt.toMillis(), b.endAt.toMillis());
  return Math.max(0, (end - start) / 60_000);
}

/**
 * Creates the event, its chat and the system message in one transaction.
 * The event id is derived from the member list, so a retried run cannot
 * create a duplicate squad for the same people and time.
 */
async function createMatch(cluster: IntentRecord[], sport: SportConfig): Promise<void> {
  const participantIds = [...new Set(cluster.map((intent) => intent.uid))].sort();
  const startAt = Timestamp.fromMillis(
    Math.max(...cluster.map((intent) => intent.startAt.toMillis())),
  );
  const endAt = Timestamp.fromMillis(
    Math.min(...cluster.map((intent) => intent.endAt.toMillis())),
  );
  const geo = midpoint(cluster.map((intent) => intent.geo));
  const areaLabel = cluster[0]?.areaLabel ?? 'Nearby';
  const radiusKm = Math.min(...cluster.map((intent) => intent.radiusKm));
  const skillLevel: SkillLevel = cluster.every((intent) => intent.skillLevel === 'any')
    ? 'any'
    : (cluster[0]?.skillLevel ?? 'any');

  const matchKey = hashKey([...participantIds, sport.id, String(startAt.toMillis())].join('|'));
  const eventId = `m_${matchKey.slice(0, 20)}`;
  const title = `${sport.label} · ${formatTime(startAt.toDate())}`;

  const eventRef = db.collection('events').doc(eventId);
  const chatRef = db.collection('chats').doc(eventId);
  const messageRef = chatRef.collection('messages').doc();
  const intentRefs = cluster.map((intent) => db.collection('intents').doc(intent.id));

  await db.runTransaction(async (transaction) => {
    const [existingEvent, existingChat, intentSnapshots] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(chatRef),
      Promise.all(intentRefs.map((ref) => transaction.get(ref))),
    ]);

    if (!existingEvent.exists) {
      transaction.set(eventRef, {
        sport: sport.id,
        title,
        startAt,
        endAt,
        geo: new GeoPoint(geo.latitude, geo.longitude),
        areaLabel,
        radiusKm,
        skillLevel,
        minPlayers: sport.minPlayers,
        capacity: sport.capacity,
        participantIds,
        status: 'confirmed',
        isOpen: false,
        source: 'match',
        venueId: null,
        venueName: null,
        chatId: eventId,
        createdBy: participantIds[0] ?? '',
        matchKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (!existingChat.exists) {
      transaction.set(chatRef, {
        eventId,
        participants: participantIds,
        activityTitle: title,
        lastMessage: 'Squad formed',
        lastMessageAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastReadAt: Object.fromEntries(
          participantIds.map((uid) => [uid, FieldValue.serverTimestamp()]),
        ),
      });

      transaction.set(messageRef, {
        id: messageRef.id,
        chatId: eventId,
        senderId: 'matchmaker',
        content: `${cluster.length} players matched. Say hello and agree on a venue.`,
        messageType: 'system',
        createdAt: FieldValue.serverTimestamp(),
        clientCreatedAt: Date.now(),
        readBy: [],
      });
    }

    intentSnapshots.forEach((snapshot, index) => {
      const ref = intentRefs[index];
      if (!ref) return;
      if (!snapshot.exists) return;
      if (snapshot.get('status') !== 'searching') return;

      transaction.update(ref, {
        status: 'matched',
        eventId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  });

  await notifyParticipants(participantIds, sport, eventId);
  logger.info('Squad created', { eventId, sport: sport.id, size: participantIds.length });
}

async function notifyParticipants(
  participantIds: string[],
  sport: SportConfig,
  eventId: string,
): Promise<void> {
  try {
    const users = await db.getAll(
      ...participantIds.map((uid) => db.collection('users').doc(uid)),
    );
    const tokens = users
      .map((user) => user.get('expoPushToken'))
      .filter(
        (token): token is string =>
          typeof token === 'string' &&
          token.length <= 200 &&
          token.startsWith('Expo'),
      );

    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token,
      title: 'Your squad is ready',
      body: `You have been matched for ${sport.label.toLowerCase()}. Open the chat to plan.`,
      sound: 'default',
      data: { eventId },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    // Push is best-effort: a failure must never roll back a created squad.
    logger.warn('Push notification failed', { eventId, error });
  }
}

function hashKey(value: string): string {
  return createHash('sha1').update(value).digest('hex');
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date);
}
