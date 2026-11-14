import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { MAP_STYLE } from '@/constants/map-style';
import { Brand } from '@/constants/theme';

const CENTER = { latitude: 40.7168, longitude: -73.9562 };

type NearbyPerson = {
  id: string;
  initial: string;
  name: string;
  activity: string;
  emoji: string;
  color: string;
  coords: { latitude: number; longitude: number };
  distance: string;
  when: string;
};

const PEOPLE: NearbyPerson[] = [
  {
    id: '1',
    initial: 'A',
    name: 'Aria',
    activity: 'Football',
    emoji: '⚽',
    color: '#E4574D',
    coords: { latitude: 40.7198, longitude: -73.9531 },
    distance: '350 m',
    when: 'in 20 min',
  },
  {
    id: '2',
    initial: 'R',
    name: 'Rohan',
    activity: 'Tennis',
    emoji: '🎾',
    color: '#4C8BF5',
    coords: { latitude: 40.7142, longitude: -73.9598 },
    distance: '520 m',
    when: 'in 45 min',
  },
  {
    id: '3',
    initial: 'M',
    name: 'Mika',
    activity: 'Music',
    emoji: '🎧',
    color: '#8B6BD9',
    coords: { latitude: 40.7215, longitude: -73.9602 },
    distance: '700 m',
    when: 'tonight',
  },
  {
    id: '4',
    initial: 'J',
    name: 'Jonas',
    activity: 'Basketball',
    emoji: '🏀',
    color: '#E08A2E',
    coords: { latitude: 40.7129, longitude: -73.9515 },
    distance: '900 m',
    when: 'in 1 hr',
  },
  {
    id: '5',
    initial: 'S',
    name: 'Sofia',
    activity: 'Cycling',
    emoji: '🚴',
    color: '#2FA36B',
    coords: { latitude: 40.7231, longitude: -73.9527 },
    distance: '1.1 km',
    when: 'tomorrow',
  },
];

/** Soft coloured halos — the signature Snapchat "activity" look. */
const HALOS = [
  { id: 'h1', center: PEOPLE[0].coords, radius: 260, color: 'rgba(228,87,77,0.16)' },
  { id: 'h2', center: PEOPLE[1].coords, radius: 210, color: 'rgba(76,139,245,0.16)' },
  { id: 'h3', center: PEOPLE[2].coords, radius: 300, color: 'rgba(139,107,217,0.16)' },
  { id: 'h4', center: PEOPLE[3].coords, radius: 230, color: 'rgba(224,138,46,0.16)' },
  { id: 'h5', center: CENTER, radius: 420, color: 'rgba(215,247,123,0.18)' },
];

const SHEET_HEIGHT = 300;
const COLLAPSED_LIFT = 40;

function AvatarPill({ person }: { person: NearbyPerson }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.pillAvatar, { backgroundColor: person.color }]}>
        <Text style={styles.pillInitial}>{person.initial}</Text>
      </View>
      <View style={styles.pillText}>
        <Text style={styles.pillActivity}>
          {person.emoji} {person.activity}
        </Text>
        <Text style={styles.pillMeta}>
          {person.distance} · {person.when}
        </Text>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const params = useLocalSearchParams<{
    date?: string;
    start?: string;
    end?: string;
    activity?: string;
  }>();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const lift = useSharedValue(0);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    lift.value = withSpring(expanded ? -COLLAPSED_LIFT : 0, { damping: 18, stiffness: 160 });
  }, [expanded, lift]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));

  const intentActivity = params.activity;
  const intentWhen = [params.date, params.start && params.end ? `${params.start} – ${params.end}` : null]
    .filter(Boolean)
    .join(' · ');

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.mapArea}>
        <MapView
          style={StyleSheet.absoluteFill}
          customMapStyle={MAP_STYLE}
          initialRegion={{
            ...CENTER,
            latitudeDelta: 0.022,
            longitudeDelta: 0.022,
          }}
          camera={{ center: CENTER, zoom: 14.5, pitch: 52, heading: 12 }}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          pitchEnabled>
        {HALOS.map((halo) => (
          <Circle
            key={halo.id}
            center={halo.center}
            radius={halo.radius}
            fillColor={halo.color}
            strokeWidth={0}
          />
        ))}

        {PEOPLE.map((person) => (
          <Marker
            key={person.id}
            coordinate={person.coords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            onPress={() => setExpanded(true)}>
            <View style={styles.markerWrap}>
              <View style={[styles.markerAvatar, { backgroundColor: person.color }]}>
                <Text style={styles.markerInitial}>{person.initial}</Text>
              </View>
              <View style={styles.markerTail} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top controls */}
      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.searchPill}>
          <Ionicons name="search" size={16} color={Brand.ink} />
          <Text style={styles.searchText}>Search Eastside</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Map filters"
          style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}>
          <Ionicons name="options-outline" size={19} color={Brand.ink} />
        </Pressable>
      </SafeAreaView>

      {/* Locate me */}
      <Animated.View style={[styles.locateWrap, fabStyle]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Center on my location"
          onPress={() => setExpanded((prev) => !prev)}
          style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}>
          <Ionicons name="locate" size={19} color={Brand.coral} />
        </Pressable>
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.sheet, { height: SHEET_HEIGHT }, sheetStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse panel' : 'Expand panel'}
          onPress={() => setExpanded((prev) => !prev)}
          style={styles.handleHit}>
          <View style={styles.handle} />
        </Pressable>

        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <Text style={styles.sheetTitle}>
              {intentActivity
                ? `${intentActivity.split(' · ')[0]} tonight`
                : `${PEOPLE.length} people nearby`}
            </Text>
            <Text style={styles.sheetSubtitle} numberOfLines={1}>
              {intentWhen || 'Up for something tonight'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open filters">
            <Text style={styles.sheetAction}>Filter</Text>
          </Pressable>
        </View>

        <View style={[styles.intentBanner, !intentActivity && styles.intentBannerMuted]}>
          <Ionicons
            name={intentActivity ? 'radio-outline' : 'information-circle-outline'}
            size={16}
            color={Brand.ink}
          />
          <Text style={styles.intentText}>
            {intentActivity
              ? "Searching within 2 km · halos show who's free now"
              : 'Tap a halo to see who is up · pan to explore'}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}>
          {PEOPLE.map((person) => (
            <AvatarPill key={person.id} person={person} />
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a squad and open the group chat"
          onPress={() =>
            router.push({
              pathname: '/plans',
              params: {
                date: params.date,
                start: params.start,
                end: params.end,
                activity: params.activity,
              },
            } as never)
          }
          style={({ pressed }) => [styles.sheetCta, pressed && styles.pressed]}>
          <Ionicons name="chatbubbles-outline" size={17} color="#fff" />
          <Text style={styles.sheetCtaText}>
            {expanded
              ? `Start a squad with ${PEOPLE.length} people`
              : 'Tap to see everyone nearby'}
          </Text>
        </Pressable>
      </Animated.View>
      </View>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  mapArea: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.cream,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.inkSecondary,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  locateWrap: {
    position: 'absolute',
    right: 16,
    bottom: SHEET_HEIGHT - 20,
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerInitial: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  markerTail: {
    width: 3,
    height: 12,
    backgroundColor: '#fff',
    marginTop: -3,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Brand.cream,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  handleHit: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8D2C6',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Brand.ink,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: Brand.inkSecondary,
    marginTop: 2,
  },
  sheetAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.coral,
    marginTop: 4,
  },
  sheetHeaderText: {
    flex: 1,
    paddingRight: 10,
  },
  intentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.limeSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  intentBannerMuted: {
    backgroundColor: '#F1EDE4',
  },
  intentText: {
    flex: 1,
    fontSize: 12,
    color: '#4A4A3A',
  },
  pillRow: {
    gap: 10,
    paddingVertical: 12,
    paddingRight: 20,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  pillAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInitial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  pillText: {
    gap: 1,
  },
  pillActivity: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.ink,
  },
  pillMeta: {
    fontSize: 11,
    color: Brand.inkSecondary,
  },
  sheetCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.coral,
    borderRadius: 999,
    height: 52,
    marginBottom: 16,
  },
  sheetCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});