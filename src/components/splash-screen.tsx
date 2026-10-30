import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

const DISPLAY_MS = 5000;
const TRACK_WIDTH = 160;

const ACTIVITIES: { name: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'football-outline' },
  { name: 'tennisball-outline' },
  { name: 'musical-notes-outline' },
  { name: 'basketball-outline' },
  { name: 'bicycle-outline' },
];

function AmbientCircle({ baseStyle, delay = 0 }: { baseStyle: ViewStyle; delay?: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1.12, { duration: 2400 }), -1, true),
    );
    return () => cancelAnimation(scale);
  }, [delay, scale]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[baseStyle, circleStyle]} />;
}

function FloatingBadge() {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(-9, { duration: 1300 }), -1, true);
    return () => cancelAnimation(float);
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <Animated.View entering={ZoomIn.springify().damping(13)}>
      <Animated.View style={[styles.badge, floatStyle]}>
        <Ionicons name="sparkles" size={30} color={Brand.lime} />
      </Animated.View>
    </Animated.View>
  );
}

function BouncingDot({ index }: { index: number }) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withDelay(
      index * 180,
      withRepeat(withTiming(-9, { duration: 420 }), -1, true),
    );
    return () => cancelAnimation(bounce);
  }, [index, bounce]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
    opacity: 1 + bounce.value / 18,
  }));

  return <Animated.View style={[styles.loaderDot, dotStyle]} />;
}

function ActivityChip({
  icon,
  index,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  index: number;
  accent?: boolean;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withDelay(
      index * 200,
      withRepeat(withTiming(-7, { duration: 1100 + index * 130 }), -1, true),
    );
    return () => cancelAnimation(drift);
  }, [index, drift]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value }, { rotate: `${drift.value * 0.9}deg` }],
  }));

  return (
    <Animated.View entering={ZoomIn.delay(700 + index * 130).springify().damping(12)}>
      <Animated.View style={[styles.chip, accent && styles.chipAccent, chipStyle]}>
        <Ionicons name={icon} size={24} color={accent ? Brand.ink : '#fff'} />
      </Animated.View>
    </Animated.View>
  );
}

function ProgressBar() {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(TRACK_WIDTH, { duration: DISPLAY_MS - 400 });
    return () => cancelAnimation(width);
  }, [width]);

  const fillStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

export function SplashOverlay() {
  const [visible, setVisible] = useState(true);
  const hiddenNative = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(450)}
      onLayout={() => {
        if (!hiddenNative.current) {
          hiddenNative.current = true;
          SplashScreen.hideAsync();
        }
      }}
      style={styles.overlay}>
      {/* Breathing background shapes */}
      <AmbientCircle baseStyle={styles.circleLime} />
      <AmbientCircle baseStyle={styles.circleWhite} delay={900} />

      <FloatingBadge />

      <Animated.View
        entering={FadeInDown.delay(150).duration(600)}
        style={styles.wordmarkWrap}>
        <Text style={styles.wordmark}>
          hapsten<Text style={styles.dot}> •</Text>
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        <Text style={styles.tagline}>Life happens outside the screen.</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(600)}
        style={styles.chipRow}>
        {ACTIVITIES.map((activity, index) => (
          <ActivityChip
            key={activity.name}
            icon={activity.name}
            index={index}
            accent={index === 1}
          />
        ))}
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(520).duration(600)}
        style={styles.loader}>
        {[0, 1, 2].map((index) => (
          <BouncingDot key={index} index={index} />
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(650).duration(600)}>
        <ProgressBar />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.coral,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  circleLime: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(215,247,123,0.22)',
  },
  circleWhite: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  wordmarkWrap: {
    alignItems: 'center',
  },
  wordmark: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  dot: {
    color: Brand.lime,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 26,
  },
  chip: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAccent: {
    backgroundColor: Brand.lime,
    borderColor: Brand.lime,
  },
  loader: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 30,
  },
  loaderDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  track: {
    width: TRACK_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 18,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.lime,
  },
});
