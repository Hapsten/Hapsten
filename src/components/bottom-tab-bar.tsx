import { Ionicons } from '@expo/vector-icons';
import { Link, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

type TabItem = {
  label: string;
  href: '/' | '/discover' | '/plans' | '/profile' | '/chat';
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const LEFT_TABS: TabItem[] = [
  { label: 'Home', href: '/', icon: 'home-outline', iconActive: 'home' },
  { label: 'Discover', href: '/discover', icon: 'people-outline', iconActive: 'people' },
];

const RIGHT_TABS: TabItem[] = [
  { label: 'Messages', href: '/chat', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { label: 'Plans', href: '/plans', icon: 'calendar-outline', iconActive: 'calendar' },
  { label: 'Profile', href: '/profile', icon: 'person-outline', iconActive: 'person' },
];

function TabButton({ tab, active }: { tab: TabItem; active: boolean }) {
  return (
    <Link href={tab.href as never} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: active }}
        style={styles.item}>
        <Ionicons
          name={active ? tab.iconActive : tab.icon}
          size={23}
          color={active ? Brand.coral : '#A8A39A'}
        />
        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </Pressable>
    </Link>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.side}>
        {LEFT_TABS.map((tab) => (
          <TabButton key={tab.label} tab={tab} active={isActive(tab.href)} />
        ))}
      </View>

      <View style={styles.center}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create event"
          onPress={() => router.push('/create' as never)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
        <Text style={styles.fabLabel}>Create</Text>
      </View>

      <View style={styles.side}>
        {RIGHT_TABS.map((tab) => (
          <TabButton key={tab.label} tab={tab} active={isActive(tab.href)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Brand.cream,
    borderTopWidth: 1,
    borderTopColor: Brand.line,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A8A39A',
  },
  labelActive: {
    color: Brand.coral,
    fontWeight: '700',
  },
  center: {
    width: 76,
    alignItems: 'center',
    gap: 3,
    marginTop: -26,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Brand.cream,
    shadowColor: Brand.coral,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  fabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A8A39A',
  },
});
