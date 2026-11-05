import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { Brand } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateChat } from '@/firebase/chat';

export default function CreateEventScreen() {
  const { user } = useAuth();
  const [time, setTime] = useState('Today · 5:00 – 7:00 PM');
  const [event, setEvent] = useState('Football · casual kickabout');
  const [location, setLocation] = useState('Newtown');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      // Create a Firebase chat for this event with the current user
      const chatId = await getOrCreateChat([user.uid], {
        activityId: event,
        activityTitle: event,
      });
      // Open the chat
      router.push(`/chat/${chatId}` as never);
    } catch {
      setCreating(false);
      // Fallback: navigate to plans if chat creation fails
      router.push(
        `/plans?activity=${encodeURIComponent(event)}&date=${encodeURIComponent(time)}` as never,
      );
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.body} edges={['top']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={20} color={Brand.ink} />
        </Pressable>
        <ThemedText type="title" style={styles.title} themeColor="text">
          Create event
        </ThemedText>
        <ThemedText type="small" style={styles.subtitle} themeColor="textSecondary">
          Pick a time, game, and location — we&apos;ll open a group chat for everyone who joins.
        </ThemedText>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoiding}
          enabled>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Field
                label="Time"
                icon="time-outline"
                value={time}
                onChangeText={setTime}
                placeholder="e.g. Today · 5:00 – 7:00 PM"
              />
              <Field
                label="Event"
                icon="football-outline"
                value={event}
                onChangeText={setEvent}
                placeholder="e.g. Football · casual kickabout"
              />
              <Field
                label="Location"
                icon="location-outline"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Newtown"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SafeAreaView style={styles.ctaWrap} edges={['bottom']}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create event and open chat"
          onPress={handleCreate}
          disabled={creating}
          style={({ pressed }) => [
            styles.cta,
            creating && styles.ctaDisabled,
            pressed && !creating && styles.pressed,
          ]}>
          <Ionicons name={creating ? 'refresh-outline' : 'checkmark'} size={18} color="#fff" />
          <ThemedText type="smallBold" style={styles.ctaText} themeColor="text">
            {creating ? 'Creating…' : 'Create · Open chat'}
          </ThemedText>
        </Pressable>
      </SafeAreaView>

      <BottomTabBar />
    </View>
  );
}

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrapper} key={label}>
      <View style={styles.fieldRow}>
        <Ionicons name={icon} size={18} color={Brand.coral} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={Brand.inkSecondary}
        />
      </View>
      <ThemedText type="small" style={styles.fieldLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  keyboardAvoiding: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20, color: Brand.inkSecondary, marginTop: 6 },
  card: {
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  fieldWrapper: {
    gap: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    color: Brand.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  fieldLabel: {
    marginLeft: 2,
  },
  ctaWrap: { backgroundColor: Brand.cream, paddingHorizontal: 20, paddingTop: 8 },
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
    elevation: 4,
  },
  ctaDisabled: {
    backgroundColor: Brand.line,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
