import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Brand } from '@/constants/theme';
import type { LocationStatus } from '@/hooks/use-current-location';

type LocationCardProps = {
  label: string;
  status: LocationStatus;
  error: string | null;
  onRequest: () => void;
};

export function LocationCard({ label, status, error, onRequest }: LocationCardProps) {
  const loading = status === 'loading';
  const ready = status === 'ready';

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, ready && styles.iconWrapReady]}>
        <Ionicons
          name={ready ? 'location' : 'location-outline'}
          size={18}
          color={ready ? Brand.ink : Brand.coral}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>Your area</Text>
        <Text style={styles.value} numberOfLines={1}>
          {ready ? label : loading ? 'Finding you…' : 'Location needed'}
        </Text>
        {error ? (
          <Text style={styles.error} numberOfLines={2}>
            {error}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ready ? 'Refresh location' : 'Use my location'}
        onPress={onRequest}
        disabled={loading}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {loading ? (
          <ActivityIndicator size="small" color={Brand.coral} />
        ) : (
          <Text style={styles.buttonText}>{ready ? 'Refresh' : 'Use GPS'}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapReady: {
    backgroundColor: Brand.limeSoft,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#A8A39A',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.ink,
  },
  error: {
    fontSize: 11,
    lineHeight: 15,
    color: Brand.coralDark,
  },
  button: {
    minWidth: 66,
    height: 36,
    borderRadius: 999,
    backgroundColor: Brand.cream,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.coral,
  },
  pressed: {
    opacity: 0.85,
  },
});
