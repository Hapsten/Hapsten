/**
 * Firestore security-rule tests for `firestore.rules`.
 *
 * Run with: npm run test:rules
 * (starts the Firestore emulator, applies the real rules file, then exits)
 *
 * Every assertion is a security boundary: if one fails, the app is either
 * leaking data or a legitimate user flow is broken.
 */
import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  GeoPoint,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-hapsteen',
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  },
});

const results = [];
async function check(name, promise) {
  try {
    await promise;
    results.push(`PASS ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error.code ?? error.message}`);
  }
}

const alice = testEnv.authenticatedContext('alice').firestore();
const bob = testEnv.authenticatedContext('bob').firestore();
const charlie = testEnv.authenticatedContext('charlie').firestore();
const anon = testEnv.unauthenticatedContext().firestore();

const future = new Date(Date.now() + 60 * 60 * 1000);
const later = new Date(Date.now() + 150 * 60 * 1000);
const geo = new GeoPoint(22.5726, 88.3639);

function profile(uid, name) {
  return {
    uid,
    displayName: name,
    email: `${uid}@example.com`,
    photoURL: null,
    homeGeo: null,
    homeGeohash: null,
    homeLabel: null,
    sports: [],
    skillLevel: 'any',
    expoPushToken: null,
    reliabilityScore: 100,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

function intent(uid) {
  return {
    uid,
    sport: 'badminton',
    startAt: Timestamp.fromDate(future),
    endAt: Timestamp.fromDate(later),
    geo,
    geohash: 'tu4v9w7',
    areaLabel: 'Salt Lake',
    radiusKm: 10,
    skillLevel: 'any',
    status: 'searching',
    eventId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(future),
  };
}

function openEvent() {
  return {
    sport: 'badminton',
    title: 'Badminton · 7:00 PM',
    startAt: Timestamp.fromDate(future),
    endAt: Timestamp.fromDate(later),
    geo,
    geohash: 'tu4v9w7',
    areaLabel: 'Salt Lake',
    radiusKm: 10,
    skillLevel: 'any',
    minPlayers: 2,
    capacity: 4,
    participantIds: ['alice'],
    status: 'forming',
    isOpen: true,
    source: 'open',
    venueId: null,
    venueName: null,
    chatId: 'e1',
    createdBy: 'alice',
    matchKey: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function openChat() {
  return {
    eventId: 'e1',
    participants: ['alice'],
    activityTitle: 'Badminton · 7:00 PM',
    lastMessage: 'Plan created',
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastReadAt: { alice: serverTimestamp() },
  };
}

function message(uid, id, content, messageType = 'text') {
  return {
    id,
    chatId: 'e1',
    senderId: uid,
    content,
    messageType,
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
    readBy: [uid],
  };
}

await testEnv.clearFirestore();

await testEnv.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'users', 'alice'), profile('alice', 'Alice'));
  await setDoc(doc(db, 'users', 'bob'), profile('bob', 'Bob'));
  await setDoc(doc(db, 'venues', 'v1'), {
    name: 'Court One',
    address: 'Salt Lake',
    geo,
    geohash: 'tu4v9w7',
    sports: ['badminton'],
    courts: 2,
    pricePerHour: 600,
    currency: 'INR',
    rating: 4.5,
    photoUrl: null,
    createdAt: Timestamp.now(),
  });

  const privateEvent = {
    ...openEvent(),
    chatId: 'm1',
    isOpen: false,
    source: 'match',
    status: 'confirmed',
    participantIds: ['alice'],
    createdBy: 'alice',
    matchKey: 'mkey',
  };
  await setDoc(doc(db, 'events', 'm1'), privateEvent);
  await setDoc(doc(db, 'chats', 'm1'), {
    ...openChat(),
    eventId: 'm1',
    lastReadAt: { alice: Timestamp.now() },
  });
});

// Profiles are private.
await check('owner reads own profile', assertSucceeds(getDoc(doc(alice, 'users', 'alice'))));
await check('other user cannot read profile', assertFails(getDoc(doc(bob, 'users', 'alice'))));
await check('anonymous cannot read profile', assertFails(getDoc(doc(anon, 'users', 'alice'))));

// Intent validation.
await check('valid intent is created', assertSucceeds(setDoc(doc(alice, 'intents', 'i1'), intent('alice'))));
await check(
  'intent with string startAt is rejected',
  assertFails(setDoc(doc(bob, 'intents', 'i2'), { ...intent('bob'), startAt: 'tomorrow' })),
);
await check(
  'intent for another user is rejected',
  assertFails(setDoc(doc(bob, 'intents', 'i3'), intent('alice'))),
);
await check(
  'intent cannot be marked matched by client',
  assertFails(updateDoc(doc(alice, 'intents', 'i1'), { status: 'matched', updatedAt: serverTimestamp() })),
);
await check(
  'intent can be cancelled by owner',
  assertSucceeds(updateDoc(doc(alice, 'intents', 'i1'), { status: 'cancelled', updatedAt: serverTimestamp() })),
);

// Event + chat creation and visibility.
const createBatch = writeBatch(alice);
createBatch.set(doc(alice, 'events', 'e1'), openEvent());
createBatch.set(doc(alice, 'chats', 'e1'), openChat());
await check('event and chat are created together', assertSucceeds(createBatch.commit()));
await check('open event is readable by others', assertSucceeds(getDoc(doc(bob, 'events', 'e1'))));
await check('private event is readable by member', assertSucceeds(getDoc(doc(alice, 'events', 'm1'))));
await check('private event is hidden from others', assertFails(getDoc(doc(bob, 'events', 'm1'))));
await check('private chat is hidden from others', assertFails(getDoc(doc(bob, 'chats', 'm1'))));

// Joining must update event and chat together.
const joinBatch = writeBatch(bob);
joinBatch.update(doc(bob, 'events', 'e1'), {
  participantIds: ['alice', 'bob'],
  status: 'confirmed',
  updatedAt: serverTimestamp(),
});
joinBatch.update(doc(bob, 'chats', 'e1'), {
  participants: ['alice', 'bob'],
  'lastReadAt.bob': serverTimestamp(),
  updatedAt: serverTimestamp(),
});
await check('join updates event and chat together', assertSucceeds(joinBatch.commit()));
await check('new member can read chat', assertSucceeds(getDoc(doc(bob, 'chats', 'e1'))));
await check('new member can read event', assertSucceeds(getDoc(doc(bob, 'events', 'e1'))));

// A stranger cannot join a private event.
const privateJoin = writeBatch(charlie);
privateJoin.update(doc(charlie, 'events', 'm1'), {
  participantIds: ['alice', 'charlie'],
  status: 'confirmed',
  updatedAt: serverTimestamp(),
});
privateJoin.update(doc(charlie, 'chats', 'm1'), {
  participants: ['alice', 'charlie'],
  'lastReadAt.charlie': serverTimestamp(),
  updatedAt: serverTimestamp(),
});
await check('stranger cannot join private event', assertFails(privateJoin.commit()));

// Messages.
await check(
  'member sends text message',
  assertSucceeds(setDoc(doc(bob, 'chats', 'e1', 'messages', 'msg1'), message('bob', 'msg1', 'hello'))),
);
await check(
  'sender id cannot be spoofed',
  assertFails(setDoc(doc(bob, 'chats', 'e1', 'messages', 'msg2'), message('alice', 'msg2', 'spoof'))),
);
await check(
  'fake system message is rejected',
  assertFails(
    setDoc(doc(bob, 'chats', 'e1', 'messages', 'msg3'), message('bob', 'msg3', 'Pay me', 'system')),
  ),
);
await check(
  'known system template is allowed',
  assertSucceeds(
    setDoc(
      doc(bob, 'chats', 'e1', 'messages', 'msg4'),
      message('bob', 'msg4', 'A player joined the plan.', 'system'),
    ),
  ),
);
await check(
  'message timestamp must be server time',
  assertFails(
    setDoc(doc(bob, 'chats', 'e1', 'messages', 'msg5'), {
      ...message('bob', 'msg5', 'backdated'),
      createdAt: Timestamp.fromMillis(Date.now() - 86_400_000),
    }),
  ),
);

// Read receipts.
await check(
  'member marks own read state',
  assertSucceeds(updateDoc(doc(bob, 'chats', 'e1'), { 'lastReadAt.bob': serverTimestamp() })),
);
await check(
  'member cannot spoof another read state',
  assertFails(updateDoc(doc(bob, 'chats', 'e1'), { 'lastReadAt.alice': serverTimestamp() })),
);

// Only the host can cancel a populated plan (bob is still a member here).
await check(
  'non-host cannot cancel populated plan',
  assertFails(
    updateDoc(doc(bob, 'events', 'e1'), { status: 'cancelled', updatedAt: serverTimestamp() }),
  ),
);

// Leaving must remove event and chat access together.
const leaveBatch = writeBatch(bob);
leaveBatch.update(doc(bob, 'events', 'e1'), {
  participantIds: ['alice'],
  status: 'forming',
  updatedAt: serverTimestamp(),
});
leaveBatch.update(doc(bob, 'chats', 'e1'), {
  participants: ['alice'],
  updatedAt: serverTimestamp(),
});
await check('leave updates event and chat together', assertSucceeds(leaveBatch.commit()));
await check('former member loses chat access', assertFails(getDoc(doc(bob, 'chats', 'e1'))));
await check('former member cannot send messages', assertFails(
  setDoc(doc(bob, 'chats', 'e1', 'messages', 'msg6'), message('bob', 'msg6', 'still here')),
));

// Venue integrity.
await check(
  'real venue can be suggested',
  assertSucceeds(
    updateDoc(doc(alice, 'events', 'e1'), {
      venueId: 'v1',
      venueName: 'Court One',
      status: 'venue_selected',
      updatedAt: serverTimestamp(),
    }),
  ),
);
await check(
  'fake venue is rejected',
  assertFails(
    updateDoc(doc(alice, 'events', 'e1'), {
      venueId: 'fake',
      venueName: 'Fake Court',
      status: 'venue_selected',
      updatedAt: serverTimestamp(),
    }),
  ),
);

// Only the host can cancel a populated plan.
await check(
  'host can cancel plan',
  assertSucceeds(
    updateDoc(doc(alice, 'events', 'e1'), { status: 'cancelled', updatedAt: serverTimestamp() }),
  ),
);

// Venues are read-only from clients.
await check('client cannot write venues', assertFails(
  setDoc(doc(alice, 'venues', 'v2'), { name: 'Hacked' }),
));

// ------------------------------------------------------------ app queries
// The list screens depend on these queries; a rule that only works for
// single-document reads would silently break the app.
await check(
  'my events query works',
  assertSucceeds(
    getDocs(
      query(
        collection(bob, 'events'),
        where('participantIds', 'array-contains', 'bob'),
        limit(50),
      ),
    ),
  ),
);
await check(
  'open events query works',
  assertSucceeds(
    getDocs(
      query(
        collection(bob, 'events'),
        where('isOpen', '==', true),
        where('status', 'in', ['forming', 'confirmed']),
        where('startAt', '>=', Timestamp.now()),
        orderBy('startAt', 'asc'),
        limit(20),
      ),
    ),
  ),
);
await check(
  'my chats query works',
  assertSucceeds(
    getDocs(query(collection(alice, 'chats'), where('participants', 'array-contains', 'alice'))),
  ),
);
await check(
  'messages query works',
  assertSucceeds(
    getDocs(
      query(
        collection(alice, 'chats', 'e1', 'messages'),
        orderBy('createdAt', 'asc'),
        limit(300),
      ),
    ),
  ),
);

// -------------------------------------------------------- more attack cases
// A client cannot create an invite-only event; only the matchmaker can.
await check(
  'client cannot create private event',
  assertFails(
    setDoc(doc(bob, 'events', 'p1'), {
      ...openEvent(),
      chatId: 'p1',
      isOpen: false,
      source: 'match',
      matchKey: 'k',
      participantIds: ['bob'],
      createdBy: 'bob',
    }),
  ),
);
await check(
  'chat cannot exist without an event',
  assertFails(
    setDoc(doc(bob, 'chats', 'orphan'), {
      ...openChat(),
      eventId: 'orphan',
      lastReadAt: { bob: serverTimestamp() },
    }),
  ),
);
await check(
  'member cannot add another player to the chat',
  assertFails(
    updateDoc(doc(alice, 'chats', 'e1'), {
      participants: ['alice', 'charlie'],
      updatedAt: serverTimestamp(),
    }),
  ),
);
// A member may only remove themselves; the host cannot eject others.
const setupBatch = writeBatch(alice);
setupBatch.set(doc(alice, 'events', 'e2'), { ...openEvent(), chatId: 'e2' });
setupBatch.set(doc(alice, 'chats', 'e2'), { ...openChat(), eventId: 'e2' });
await check('second plan is created', assertSucceeds(setupBatch.commit()));

const joinBatch2 = writeBatch(bob);
joinBatch2.update(doc(bob, 'events', 'e2'), {
  participantIds: ['alice', 'bob'],
  status: 'confirmed',
  updatedAt: serverTimestamp(),
});
joinBatch2.update(doc(bob, 'chats', 'e2'), {
  participants: ['alice', 'bob'],
  'lastReadAt.bob': serverTimestamp(),
  updatedAt: serverTimestamp(),
});
await check('second player joins the plan', assertSucceeds(joinBatch2.commit()));

await check(
  'member cannot remove another member from the event',
  assertFails(
    updateDoc(doc(alice, 'events', 'e2'), {
      participantIds: ['alice'],
      updatedAt: serverTimestamp(),
    }),
  ),
);
await check(
  'member cannot add a third player to the event',
  assertFails(
    updateDoc(doc(bob, 'events', 'e2'), {
      participantIds: ['alice', 'bob', 'charlie'],
      updatedAt: serverTimestamp(),
    }),
  ),
);
await check(
  'member cannot rewrite the plan creator',
  assertFails(
    updateDoc(doc(bob, 'events', 'e2'), {
      createdBy: 'bob',
      updatedAt: serverTimestamp(),
    }),
  ),
);

// The real send path: message + chat preview in one batch.
const sendBatch = writeBatch(bob);
const sentRef = doc(collection(bob, 'chats', 'e2', 'messages'));
sendBatch.set(sentRef, {
  id: sentRef.id,
  chatId: 'e2',
  senderId: 'bob',
  content: 'hello squad',
  messageType: 'text',
  createdAt: serverTimestamp(),
  clientCreatedAt: Date.now(),
  readBy: ['bob'],
});
sendBatch.set(
  doc(bob, 'chats', 'e2'),
  { lastMessage: 'hello squad', lastMessageAt: serverTimestamp(), updatedAt: serverTimestamp() },
  { merge: true },
);
await check('sending a message updates the chat preview', assertSucceeds(sendBatch.commit()));

// The real leave path: membership update + leave notice in one batch.
const leaveBatch2 = writeBatch(bob);
leaveBatch2.update(doc(bob, 'events', 'e2'), {
  participantIds: ['alice'],
  status: 'forming',
  updatedAt: serverTimestamp(),
});
leaveBatch2.update(doc(bob, 'chats', 'e2'), {
  participants: ['alice'],
  updatedAt: serverTimestamp(),
});
const leaveMsgRef = doc(collection(bob, 'chats', 'e2', 'messages'));
leaveBatch2.set(leaveMsgRef, {
  id: leaveMsgRef.id,
  chatId: 'e2',
  senderId: 'bob',
  content: 'A player left the plan.',
  messageType: 'system',
  createdAt: serverTimestamp(),
  clientCreatedAt: Date.now(),
  readBy: ['bob'],
});
await check('leaver can post the leave notice while leaving', assertSucceeds(leaveBatch2.commit()));
await check(
  'leaver cannot read messages afterwards',
  assertFails(getDocs(query(collection(bob, 'chats', 'e2', 'messages'), limit(10)))),
);
await check(
  'outsider cannot read plan messages',
  assertFails(
    getDocs(query(collection(charlie, 'chats', 'e1', 'messages'), limit(10))),
  ),
);
await check(
  'profile update cannot change email or trust score',
  assertFails(
    updateDoc(doc(alice, 'users', 'alice'), {
      email: 'new@example.com',
      updatedAt: serverTimestamp(),
    }),
  ),
);
await check(
  'profile update can change display name',
  assertSucceeds(
    updateDoc(doc(alice, 'users', 'alice'), {
      displayName: 'Alice B',
      updatedAt: serverTimestamp(),
    }),
  ),
);
await check(
  'intent radius above the limit is rejected',
  assertFails(setDoc(doc(charlie, 'intents', 'i9'), { ...intent('charlie'), radiusKm: 500 })),
);
await check(
  'event capacity above the limit is rejected',
  assertFails(
    setDoc(doc(bob, 'events', 'big'), {
      ...openEvent(),
      chatId: 'big',
      participantIds: ['bob'],
      createdBy: 'bob',
      capacity: 500,
      minPlayers: 2,
    }),
  ),
);
await check(
  'oversized message is rejected',
  assertFails(
    setDoc(
      doc(alice, 'chats', 'e1', 'messages', 'long'),
      message('alice', 'long', 'x'.repeat(2001)),
    ),
  ),
);

console.log(results.join('\n'));
const failures = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failures.length}/${results.length} passed`);
await testEnv.cleanup();
process.exit(failures.length === 0 ? 0 : 1);
