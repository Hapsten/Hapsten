import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type GeoPoint,
} from 'firebase/firestore';

import { getSport } from '@/constants/sports';
import { db } from '@/firebase/config';
import { encodeGeohash } from '@/lib/geo';
import { formatTime } from '@/lib/plan-time';
import type { SkillLevel, SportEvent, SportId } from '@/types/models';

export type CreateOpenEventInput = {
  uid: string;
  sport: SportId;
  startAt: Date;
  endAt: Date;
  geo: GeoPoint;
  areaLabel: string;
  radiusKm: number;
  skillLevel: SkillLevel;
  capacity?: number;
  minPlayers?: number;
};

/**
 * Hosts an open plan. The event and its chat share the same document id,
 * so a plan can never end up with two chat rooms.
 */
export async function createOpenEvent(input: CreateOpenEventInput): Promise<string> {
  const sport = getSport(input.sport);
  const eventRef = doc(collection(db, 'events'));
  const eventId = eventRef.id;
  const chatRef = doc(db, 'chats', eventId);
  const title = `${sport.label} · ${formatTime(input.startAt)}`;
  const participants = [input.uid];
  const capacity = input.capacity ?? sport.capacity;
  const minPlayers = input.minPlayers ?? sport.minPlayers;

  const batch = writeBatch(db);
  batch.set(eventRef, {
    sport: input.sport,
    title,
    startAt: Timestamp.fromDate(input.startAt),
    endAt: Timestamp.fromDate(input.endAt),
    geo: input.geo,
    geohash: encodeGeohash(input.geo.latitude, input.geo.longitude),
    areaLabel: input.areaLabel,
    radiusKm: input.radiusKm,
    skillLevel: input.skillLevel,
    minPlayers,
    capacity,
    participantIds: participants,
    status: 'forming',
    isOpen: true,
    source: 'open',
    venueId: null,
    venueName: null,
    chatId: eventId,
    createdBy: input.uid,
    matchKey: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(chatRef, {
    eventId,
    participants,
    activityTitle: title,
    lastMessage: 'Plan created',
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastReadAt: { [input.uid]: serverTimestamp() },
  });

  await batch.commit();

  // Written after the chat exists so security rules can verify membership.
  const messageRef = doc(collection(db, 'chats', eventId, 'messages'));
  await setDoc(messageRef, {
    id: messageRef.id,
    chatId: eventId,
    senderId: input.uid,
    content: 'Plan created. Share it or wait for players to join.',
    messageType: 'system',
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
    readBy: [input.uid],
  });

  return eventId;
}

/**
 * Joins an open plan. Capacity and membership are re-checked inside a
 * transaction so two people cannot take the last spot at the same time.
 */
export async function joinEvent(eventId: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const eventRef = doc(db, 'events', eventId);
    const chatRef = doc(db, 'chats', eventId);
    const snapshot = await transaction.get(eventRef);

    if (!snapshot.exists()) throw new Error('This plan no longer exists.');
    const event = snapshot.data() as SportEvent;

    if (event.participantIds.includes(uid)) return;
    if (!event.isOpen) throw new Error('This plan is invite-only.');
    if (event.status === 'cancelled' || event.status === 'completed') {
      throw new Error('This plan is closed.');
    }
    if (event.participantIds.length >= event.capacity) {
      throw new Error('This plan is already full.');
    }

    const participants = [...event.participantIds, uid];
    transaction.update(eventRef, {
      participantIds: participants,
      status: participants.length >= event.minPlayers ? 'confirmed' : 'forming',
      updatedAt: serverTimestamp(),
    });
    // Dot path keeps other members' read timestamps intact.
    transaction.update(chatRef, {
      participants,
      [`lastReadAt.${uid}`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  // Written after the transaction: security rules check the stored member list,
  // which does not include the joining player until the transaction commits.
  const messageRef = doc(collection(db, 'chats', eventId, 'messages'));
  await setDoc(messageRef, {
    id: messageRef.id,
    chatId: eventId,
    senderId: uid,
    content: 'A player joined the plan.',
    messageType: 'system',
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
    readBy: [uid],
  });
}

export async function leaveEvent(eventId: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const eventRef = doc(db, 'events', eventId);
    const chatRef = doc(db, 'chats', eventId);
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists()) return;

    const event = snapshot.data() as SportEvent;
    if (!event.participantIds.includes(uid)) return;

    const participants = event.participantIds.filter((id) => id !== uid);
    const status =
      participants.length === 0
        ? 'cancelled'
        : participants.length >= event.minPlayers
          ? 'confirmed'
          : 'forming';

    transaction.update(eventRef, {
      participantIds: participants,
      status,
      updatedAt: serverTimestamp(),
    });
    transaction.update(chatRef, {
      participants,
      updatedAt: serverTimestamp(),
    });

    const messageRef = doc(collection(db, 'chats', eventId, 'messages'));
    transaction.set(messageRef, {
      id: messageRef.id,
      chatId: eventId,
      senderId: uid,
      content: 'A player left the plan.',
      messageType: 'system',
      createdAt: serverTimestamp(),
      clientCreatedAt: Date.now(),
      readBy: [uid],
    });
  });
}

export function subscribeToMyEvents(
  uid: string,
  callback: (events: SportEvent[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'events'),
    where('participantIds', 'array-contains', uid),
    limit(50),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as DocumentData) }) as SportEvent)
        .sort((a, b) => (a.startAt?.toMillis?.() ?? 0) - (b.startAt?.toMillis?.() ?? 0));
      callback(events);
    },
    (error) => onError?.(error),
  );
}

export function subscribeToOpenEvents(
  callback: (events: SportEvent[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'events'),
    where('isOpen', '==', true),
    where('status', 'in', ['forming', 'confirmed']),
    where('startAt', '>=', Timestamp.now()),
    orderBy('startAt', 'asc'),
    limit(20),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...(docSnap.data() as DocumentData) }) as SportEvent,
      );
      callback(events);
    },
    (error) => onError?.(error),
  );
}

export function subscribeToEvent(
  eventId: string,
  callback: (event: SportEvent | null) => void,
): () => void {
  return onSnapshot(doc(db, 'events', eventId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...(snapshot.data() as DocumentData) } as SportEvent);
  });
}

export async function getEvent(eventId: string): Promise<SportEvent | null> {
  const snapshot = await getDoc(doc(db, 'events', eventId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...(snapshot.data() as DocumentData) } as SportEvent;
}

/** Phase 4 hook point: attach a venue without starting the booking flow. */
export async function suggestVenue(
  eventId: string,
  venue: { id: string; name: string },
  uid: string,
): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const chatRef = doc(db, 'chats', eventId);
  const batch = writeBatch(db);
  batch.update(eventRef, {
    venueId: venue.id,
    venueName: venue.name,
    status: 'venue_selected',
    updatedAt: serverTimestamp(),
  });
  batch.update(chatRef, { updatedAt: serverTimestamp() });

  const messageRef = doc(collection(db, 'chats', eventId, 'messages'));
  batch.set(messageRef, {
    id: messageRef.id,
    chatId: eventId,
    senderId: uid,
    content: `Venue suggested: ${venue.name}`,
    messageType: 'system',
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
    readBy: [uid],
  });

  await batch.commit();
}

export async function setEventStatus(
  eventId: string,
  status: SportEvent['status'],
): Promise<void> {
  await setDoc(doc(db, 'events', eventId), { status, updatedAt: serverTimestamp() }, { merge: true });
}
