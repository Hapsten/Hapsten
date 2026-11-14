import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type GeoPoint,
} from 'firebase/firestore';

import { db } from '@/firebase/config';
import { encodeGeohash } from '@/lib/geo';
import type { Intent, SkillLevel, SportId } from '@/types/models';

export type CreateIntentInput = {
  uid: string;
  sport: SportId;
  startAt: Date;
  endAt: Date;
  geo: GeoPoint;
  areaLabel: string;
  radiusKm: number;
  skillLevel: SkillLevel;
};

/**
 * Posts a "looking for players" intent. Only one active intent per user:
 * older searching intents are cancelled in the same batch.
 */
export async function createIntent(input: CreateIntentInput): Promise<string> {
  const intentsRef = collection(db, 'intents');
  const existing = await getDocs(
    query(intentsRef, where('uid', '==', input.uid), where('status', '==', 'searching')),
  );

  const batch = writeBatch(db);
  existing.docs.forEach((snapshot) => {
    batch.update(snapshot.ref, { status: 'cancelled', updatedAt: serverTimestamp() });
  });

  const ref = doc(intentsRef);
  batch.set(ref, {
    uid: input.uid,
    sport: input.sport,
    startAt: Timestamp.fromDate(input.startAt),
    endAt: Timestamp.fromDate(input.endAt),
    geo: input.geo,
    geohash: encodeGeohash(input.geo.latitude, input.geo.longitude),
    areaLabel: input.areaLabel,
    radiusKm: input.radiusKm,
    skillLevel: input.skillLevel,
    status: 'searching',
    eventId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // A squad is useless once the slot has started.
    expiresAt: Timestamp.fromDate(input.startAt),
  });

  await batch.commit();
  return ref.id;
}

export async function cancelIntent(intentId: string): Promise<void> {
  await updateDoc(doc(db, 'intents', intentId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/** Real-time subscription to the user's active intent (if any). */
export function subscribeToMyIntent(
  uid: string,
  callback: (intent: Intent | null) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'intents'),
    where('uid', '==', uid),
    where('status', '==', 'searching'),
    limit(5),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const intents = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as DocumentData) }) as Intent)
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      callback(intents[0] ?? null);
    },
    (error) => onError?.(error),
  );
}

export function subscribeToIntent(
  intentId: string,
  callback: (intent: Intent | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'intents', intentId),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ id: snapshot.id, ...(snapshot.data() as DocumentData) } as Intent);
    },
    (error) => onError?.(error),
  );
}
