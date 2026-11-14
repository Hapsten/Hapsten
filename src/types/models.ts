import type { GeoPoint, Timestamp } from 'firebase/firestore';

/** Canonical sport ids. Keep in sync with `src/constants/sports.ts` and `functions/src/index.ts`. */
export type SportId =
  | 'badminton'
  | 'tennis'
  | 'football'
  | 'basketball'
  | 'cricket'
  | 'pickleball';

export type SkillLevel = 'any' | 'beginner' | 'intermediate' | 'advanced';

export type LatLng = { latitude: number; longitude: number };

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  homeGeo: GeoPoint | null;
  homeGeohash: string | null;
  homeLabel: string | null;
  sports: SportId[];
  skillLevel: SkillLevel;
  expoPushToken: string | null;
  reliabilityScore: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type IntentStatus = 'searching' | 'matched' | 'cancelled' | 'expired';

export type Intent = {
  id: string;
  uid: string;
  sport: SportId;
  startAt: Timestamp;
  endAt: Timestamp;
  geo: GeoPoint;
  geohash: string;
  areaLabel: string;
  radiusKm: number;
  skillLevel: SkillLevel;
  status: IntentStatus;
  eventId: string | null;
  createdAt: Timestamp | null;
  expiresAt: Timestamp;
};

export type EventStatus =
  | 'forming'
  | 'confirmed'
  | 'venue_selected'
  | 'booked'
  | 'cancelled'
  | 'completed';

export type EventSource = 'open' | 'match';

export type SportEvent = {
  id: string;
  sport: SportId;
  title: string;
  startAt: Timestamp;
  endAt: Timestamp;
  geo: GeoPoint;
  geohash: string;
  areaLabel: string;
  radiusKm: number;
  skillLevel: SkillLevel;
  minPlayers: number;
  capacity: number;
  participantIds: string[];
  status: EventStatus;
  isOpen: boolean;
  source: EventSource;
  venueId: string | null;
  venueName: string | null;
  chatId: string;
  createdBy: string;
  matchKey: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type Venue = {
  id: string;
  name: string;
  address: string;
  geo: GeoPoint;
  geohash: string;
  sports: SportId[];
  courts: number;
  pricePerHour: number | null;
  currency: string;
  rating: number | null;
  photoUrl: string | null;
  createdAt: Timestamp | null;
};

export type SlotStatus = 'available' | 'held' | 'booked';

/** Reserved for the booking phase. Payment is intentionally not implemented yet. */
export type VenueSlot = {
  id: string;
  venueId: string;
  startAt: Timestamp;
  endAt: Timestamp;
  court: string;
  price: number;
  currency: string;
  status: SlotStatus;
  holdUntil: Timestamp | null;
  bookingId: string | null;
};
