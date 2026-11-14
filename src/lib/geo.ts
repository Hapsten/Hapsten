import type { GeoPoint } from 'firebase/firestore';

import type { LatLng } from '@/types/models';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Small dependency-free geohash encoder. Firestore has no native radius query,
 * so we store a geohash and let the matcher query neighbouring cells.
 */
export function encodeGeohash(lat: number, lng: number, precision = 7): string {
  let minLat = -90;
  let maxLat = 90;
  let minLng = -180;
  let maxLng = 180;
  let hash = '';
  let bit = 0;
  let charValue = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        charValue = (charValue << 1) | 1;
        minLng = mid;
      } else {
        charValue = charValue << 1;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        charValue = (charValue << 1) | 1;
        minLat = mid;
      } else {
        charValue = charValue << 1;
        maxLat = mid;
      }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      hash += BASE32[charValue];
      bit = 0;
      charValue = 0;
    }
  }

  return hash;
}

export function toLatLng(geo: GeoPoint): LatLng {
  return { latitude: geo.latitude, longitude: geo.longitude };
}

/** Haversine distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function midpoint(points: LatLng[]): LatLng {
  if (points.length === 0) return { latitude: 0, longitude: 0 };
  const total = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: total.latitude / points.length,
    longitude: total.longitude / points.length,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
