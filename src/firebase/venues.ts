import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from 'firebase/firestore';

import { db } from '@/firebase/config';
import type { Venue } from '@/types/models';

/**
 * Venues are curated data (see docs/ROADMAP.md). The app only reads them;
 * writes happen from the Firebase console or an admin script.
 */
export function subscribeToVenues(
  callback: (venues: Venue[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(db, 'venues'), orderBy('name', 'asc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const venues = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...(docSnap.data() as DocumentData) }) as Venue,
      );
      callback(venues);
    },
    (error) => onError?.(error),
  );
}
