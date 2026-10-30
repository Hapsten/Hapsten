import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

const HEADER_IMAGE =
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1000&q=80&auto=format&fit=crop';

const DATE_OPTIONS = ['Today · Saturday, Sep 27', 'Tomorrow · Sunday, Sep 28', 'Monday, Sep 29'];
const START_OPTIONS = ['6:30 PM', '7:00 PM', '7:30 PM'];
const END_OPTIONS = ['9:00 PM', '10:00 PM', '11:00 PM'];
const ACTIVITY_OPTIONS = [
  'Picnic & easy conversation',
  'Football · casual kickabout',
  'Coffee & neighbourhood walk',
  'Board games & chill',
];

function Field({
  label,
  value,
  icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}>
      <View style={styles.fieldIconWrap}>
        <Text style={styles.fieldIcon}>{icon}</Text>
      </View>
      <View style={styles.fieldTextWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.chevron}>﹀</Text>
    </Pressable>
  );
}

function cycle(options: string[], current: string) {
  return options[(options.indexOf(current) + 1) % options.length];
}

export default function DiscoverScreen() {
  const [date, setDate] = useState(DATE_OPTIONS[0]);
  const [start, setStart] = useState(START_OPTIONS[0]);
  const [end, setEnd] = useState(END_OPTIONS[0]);
  const [activity, setActivity] = useState(ACTIVITY_OPTIONS[0]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: HEADER_IMAGE }} style={styles.headerImage} contentFit="cover" />
          <View style={styles.headerShade} />
          <SafeAreaView style={styles.headerTop} edges={['top']}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <Text style={styles.headerCaption}>Discover nearby</Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Sheet */}
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>What are you up for?</Text>
          <Text style={styles.subtitle}>
            Set your window and activity. We&apos;ll match you with something close.
          </Text>

          <View style={styles.fields}>
            <Field
              label="DATE"
              value={date}
              icon="▦"
              accessibilityLabel={`Date, ${date}. Tap to change.`}
              onPress={() => setDate(cycle(DATE_OPTIONS, date))}
            />
            <View style={styles.timeRow}>
              <View style={styles.timeHalf}>
                <Field
                  label="START TIME"
                  value={start}
                  icon="◷"
                  accessibilityLabel={`Start time, ${start}. Tap to change.`}
                  onPress={() => setStart(cycle(START_OPTIONS, start))}
                />
              </View>
              <View style={styles.timeHalf}>
                <Field
                  label="END TIME"
                  value={end}
                  icon="◷"
                  accessibilityLabel={`End time, ${end}. Tap to change.`}
                  onPress={() => setEnd(cycle(END_OPTIONS, end))}
                />
              </View>
            </View>
            <Field
              label="ACTIVITY"
              value={activity}
              icon="⛺"
              accessibilityLabel={`Activity, ${activity}. Tap to change.`}
              onPress={() => setActivity(cycle(ACTIVITY_OPTIONS, activity))}
            />
          </View>

          <View style={styles.note}>
            <Text style={styles.noteIcon}>⚡</Text>
            <Text style={styles.noteText}>You can change these details while we search.</Text>
          </View>

          {/* Spacer so CTA can stick to bottom on tall screens */}
          <View style={styles.spacer} />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <SafeAreaView style={styles.ctaWrap} edges={['bottom']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search nearby"
          onPress={() =>
            router.push({
              pathname: '/map',
              params: { date, start, end, activity },
            } as never)
          }
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaIcon}>⌕</Text>
          <Text style={styles.ctaText}>Go · Search nearby</Text>
        </Pressable>
      </SafeAreaView>
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
    paddingBottom: 8,
  },
  header: {
    height: 220,
    backgroundColor: '#2b2b2b',
  },
  headerImage: {
    ...StyleSheet.absoluteFill,
  },
  headerShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerCaption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  sheet: {
    backgroundColor: Brand.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    minHeight: 420,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8D2C6',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.ink,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.inkSecondary,
    marginTop: 6,
  },
  fields: {
    marginTop: 18,
    gap: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  fieldPressed: {
    opacity: 0.85,
  },
  fieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIcon: {
    fontSize: 17,
    color: Brand.coral,
  },
  fieldTextWrap: {
    flex: 1,
    gap: 1,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#A8A39A',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.ink,
  },
  chevron: {
    fontSize: 14,
    color: '#A8A39A',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeHalf: {
    flex: 1,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.limeSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  noteIcon: {
    fontSize: 15,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#4A4A3A',
  },
  spacer: {
    height: 24,
  },
  ctaWrap: {
    backgroundColor: Brand.cream,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.coral,
    borderRadius: 999,
    height: 56,
    shadowColor: Brand.coral,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaIcon: {
    color: '#fff',
    fontSize: 17,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
