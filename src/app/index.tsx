import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { Brand } from '@/constants/theme';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1000&q=80&auto=format&fit=crop';
const PICNIC_IMAGE =
  'https://images.unsplash.com/photo-1526401485004-46910ecc8e51?w=700&q=80&auto=format&fit=crop';
const ROOFTOP_IMAGE =
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80&auto=format&fit=crop';
const BONFIRE_IMAGE =
  'https://images.unsplash.com/photo-1475738972911-5b44ce984c42?w=700&q=80&auto=format&fit=crop';

type NearbyEvent = {
  id: string;
  badge: string;
  title: string;
  meta: string;
  image: string;
};

const NEARBY: NearbyEvent[] = [
  { id: '1', badge: 'Tonight', title: 'Sunset picnic', meta: 'River Park · 5 people', image: PICNIC_IMAGE },
  { id: '2', badge: 'Tonight', title: 'Rooftop social', meta: 'Morrow Deck · 3 people', image: ROOFTOP_IMAGE },
  { id: '3', badge: 'Tomorrow', title: 'Bonfire & stories', meta: 'Lake Edge · 8 people', image: BONFIRE_IMAGE },
];

function EventCard({ event }: { event: NearbyEvent }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.meta}`}
      onPress={() => router.push('/discover' as never)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <Image source={{ uri: event.image }} style={styles.cardImage} contentFit="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        style={styles.cardShade}
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{event.badge}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {event.meta}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero — CTAs live here in the thumb zone */}
        <View style={styles.hero}>
          <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} contentFit="cover" />
          <BlurView intensity={75} tint="dark" style={styles.heroBlur} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.heroShade}
          />
          <SafeAreaView style={styles.heroTop} edges={['top']}>
            <View style={styles.heroTopRow}>
              <Text style={styles.logo}>
                hapsten<Text style={styles.logoDot}> •</Text>
              </Text>
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={14} color="#fff" />
                <Text style={styles.locationText}>Eastside</Text>
              </View>
            </View>
          </SafeAreaView>
          <View style={styles.heroBody}>
            <View style={styles.livePill}>
              <Ionicons name="sparkles" size={13} color={Brand.lime} />
              <Text style={styles.livePillText}>12 up for tonight near you</Text>
            </View>
            <Text style={styles.headline}>
              What could happen{'\n'}
              <Text style={styles.headlineAccent}>tonight?</Text>
            </Text>
            <Text style={styles.subhead}>
              Find nearby people who are up for the same thing — right now.
            </Text>
            <View style={styles.ctaRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discover people. Find your squad tonight."
                onPress={() => router.push('/discover' as never)}
                style={({ pressed }) => [styles.discoverBtn, pressed && styles.pressed]}>
                <View style={styles.discoverBadge}>
                  <Ionicons name="people-outline" size={20} color="#fff" />
                </View>
                <View style={styles.btnTextWrap}>
                  <Text style={styles.discoverText}>Discover people</Text>
                  <Text style={styles.discoverSub}>Find your squad tonight</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discover events. See what's on nearby."
                onPress={() => router.push('/map' as never)}
                style={({ pressed }) => [styles.eventsBtn, pressed && styles.pressed]}>
                <View style={styles.eventsBadge}>
                  <Ionicons name="calendar-outline" size={20} color={Brand.ink} />
                </View>
                <View style={styles.btnTextWrap}>
                  <Text style={styles.eventsText}>Discover events</Text>
                  <Text style={styles.eventsSub}>See what&apos;s on nearby</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(28,27,26,0.55)" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Nearby — pinned to the bottom */}
        <View style={styles.spacer} />
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Happening nearby</Text>
            <Text style={styles.sectionSubtitle}>Join while there&apos;s still time</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all events on the map"
            onPress={() => router.push('/map' as never)}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
          snapToInterval={244}
          decelerationRate="fast">
          {NEARBY.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ScrollView>
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  hero: {
    height: 640,
    backgroundColor: '#2b2b2b',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroBlur: {
    ...StyleSheet.absoluteFill,
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
  },
  heroTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  logo: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoDot: {
    color: Brand.lime,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  locationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  heroBody: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    gap: 12,
  },
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  livePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  headline: {
    color: '#fff',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headlineAccent: {
    color: Brand.lime,
  },
  subhead: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
  },
  ctaRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.coral,
    borderRadius: 20,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  discoverText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  discoverSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  discoverBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWrap: {
    flex: 1,
    gap: 1,
  },
  eventsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.lime,
    borderRadius: 20,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  eventsBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(28,27,26,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsText: {
    color: Brand.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  eventsSub: {
    color: '#5A564E',
    fontSize: 12,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Brand.ink,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Brand.inkSecondary,
    marginTop: 2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.coral,
    marginTop: 4,
  },
  cardRow: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: 232,
    height: 188,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ddd',
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
  },
  cardShade: {
    ...StyleSheet.absoluteFill,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Brand.lime,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.ink,
  },
  cardFooter: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
});
