import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { BottomTabBar } from '@/components/bottom-tab-bar';

type StatItem = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
};

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  onPress?: () => void;
  destructive?: boolean;
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Hapsteen User';
  const email = user?.email || '';
  const photoURL = user?.photoURL;

  const stats: StatItem[] = [
    { label: 'Events Joined', value: 0, icon: 'calendar-outline' },
    { label: 'Squads', value: 0, icon: 'people-outline' },
    { label: 'Badges', value: 0, icon: 'medal-outline' },
  ];

  const menuItems: MenuItem[] = [
    { label: 'Edit Profile', icon: 'create-outline', href: '/profile/edit' },
    { label: 'Verified Events', icon: 'checkmark-circle-outline' },
    { label: 'Notifications', icon: 'notifications-outline' },
    { label: 'Privacy & Security', icon: 'lock-closed-outline' },
    { label: 'Help & Support', icon: 'help-circle-outline' },
    { label: 'Logout', icon: 'log-out-outline', destructive: true, onPress: handleLogout },
  ];

  function handleLogout() {
    logout();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Profile Header */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              {photoURL ? (
                <ImageWithFallback
                  source={{ uri: photoURL }}
                  style={styles.avatar}
                  fallback={displayName.charAt(0).toUpperCase()}
                />
              ) : (
                <AvatarPlaceholder letter={displayName.charAt(0).toUpperCase()} />
              )}
            </View>
            <View style={styles.info}>
              <ThemedText type="title" style={styles.name} themeColor="text">
                {displayName}
              </ThemedText>
              <ThemedText type="small" style={styles.email} themeColor="textSecondary">
                {email}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => router.push('/profile/edit' as never)}
              style={styles.editBtn}>
              <Ionicons name="create-outline" size={20} color={Brand.coral} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Stats */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle} themeColor="textSecondary">
              Overview
            </ThemedText>
            <View style={styles.statsRow}>
              {stats.map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name={stat.icon} size={20} color={Brand.coral} />
                  </View>
                  <ThemedText type="smallBold" style={styles.statValue} themeColor="text">
                    {stat.value}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={styles.statLabel}
                    themeColor="textSecondary"
                  >
                    {stat.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Menu */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle} themeColor="textSecondary">
              Settings
            </ThemedText>
            <View style={styles.menuList}>
              {menuItems.map((item, index) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.menuItem,
                    item.destructive && styles.menuItemDestructive,
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.menuIcon}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={
                        item.destructive
                          ? Brand.coralDark
                          : Brand.inkSecondary
                      }
                    />
                  </View>
                  <ThemedText
                    type="default"
                    style={[
                      styles.menuLabel,
                      item.destructive && styles.menuLabelDestructive,
                    ]}
                    themeColor="text"
                  >
                    {item.label}
                  </ThemedText>
                  {!item.destructive && item.href ? (
                    <Ionicons name="chevron-forward" size={18} color={Brand.inkSecondary} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

function AvatarPlaceholder({ letter }: { letter: string }) {
  return (
    <View style={styles.avatarPlaceholder}>
      <ThemedText type="title" style={styles.avatarLetter} themeColor="text">
        {letter}
      </ThemedText>
    </View>
  );
}

function ImageWithFallback({
  source,
  style,
  fallback,
}: {
  source: { uri: string };
  style: any;
  fallback: string;
}) {
  return (
    <View style={[styles.avatarContainer]}>
      <Pressable style={styles.avatar}>
        {/* expo-image or Image can go here; kept as View for now to match app style */}
        <ThemedText type="title" style={styles.avatarLetter} themeColor="text">
          {fallback}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Spacing.six,
  },
  header: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Brand.line,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Brand.line,
  },
  avatarLetter: {
    fontSize: 34,
    fontWeight: '800',
    color: Brand.ink,
  },
  info: {
    gap: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 14,
    color: Brand.inkSecondary,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.line,
    marginVertical: 20,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.limeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.ink,
  },
  statLabel: {
    fontSize: 12,
    color: Brand.inkSecondary,
    marginTop: 4,
  },
  menuList: {
    gap: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  menuItemDestructive: {
    borderColor: Brand.coral,
    backgroundColor: '#FDF2F1',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Brand.ink,
    flex: 1,
  },
  menuLabelDestructive: {
    color: Brand.coralDark,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  spacer: {
    height: 20,
  },
});
