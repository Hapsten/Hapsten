export type LatLng = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Haversine distance in kilometres. Mirrors `src/lib/geo.ts` in the app. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
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
