import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type GeoPoint,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from '@/firebase/config';
import { encodeGeohash } from '@/lib/geo';
import type { UserProfile } from '@/types/models';

export type UserProfileInput = Partial<
  Pick<UserProfile, 'displayName' | 'photoURL' | 'sports' | 'skillLevel' | 'homeLabel'>
>;

/**
 * Creates the Firestore profile on first sign-in. Safe to call repeatedly:
 * it only writes when the document is missing, so `createdAt` is never overwritten.
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  await setDoc(
    ref,
    {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Hapsteen user',
      email: user.email ?? '',
      photoURL: user.photoURL ?? null,
      homeGeo: null,
      homeGeohash: null,
      homeLabel: null,
      sports: [],
      skillLevel: 'any',
      expoPushToken: null,
      reliabilityScore: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserProfile(uid: string, input: UserProfileInput): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function saveUserLocation(
  uid: string,
  geo: GeoPoint,
  label: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    homeGeo: geo,
    homeGeohash: encodeGeohash(geo.latitude, geo.longitude),
    homeLabel: label,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ uid: snapshot.id, ...(snapshot.data() as DocumentData) } as UserProfile);
  });
}
