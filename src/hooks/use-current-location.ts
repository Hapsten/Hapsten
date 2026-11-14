import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

import type { LatLng } from '@/types/models';

export type LocationStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

type CurrentLocationState = {
  coords: LatLng | null;
  label: string;
  status: LocationStatus;
  error: string | null;
  request: () => Promise<void>;
};

/**
 * Foreground-only location. Works in Expo Go on Android and iOS.
 * Permission is requested when the user taps "Use my location" or when a
 * screen explicitly calls `request()`.
 */
export function useCurrentLocation(): CurrentLocationState {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        setError('Location permission is needed to find players and courts near you.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoords(nextCoords);
      setStatus('ready');

      try {
        const [place] = await Location.reverseGeocodeAsync(nextCoords);
        const parts = [place?.district || place?.name, place?.city].filter(Boolean);
        setLabel(parts.join(', ') || formatCoords(nextCoords));
      } catch {
        setLabel(formatCoords(nextCoords));
      }
    } catch (locationError: any) {
      setStatus('error');
      setError(locationError?.message ?? 'Could not read your location. Try again.');
    }
  }, []);

  return { coords, label, status, error, request };
}

function formatCoords(coords: LatLng): string {
  return `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;
}
