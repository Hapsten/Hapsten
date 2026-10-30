import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already signed in, redirect to home
  React.useEffect(() => {
    if (user) {
      router.replace('/' as never);
    }
  }, [user]);

  const isSignin = mode === 'signin';

  const handleSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (isSignin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name || undefined);
      }
    } catch {
      // Errors are surfaced by the auth context via Alert
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoiding}
          enabled>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="title" style={styles.logo}>
                hapsten<Text style={styles.logoDot}> •</Text>
              </ThemedText>
              <View style={styles.divider} />
              <ThemedText type="subtitle" style={styles.title} themeColor="text">
                {isSignin ? 'Welcome back' : 'Create account'}
              </ThemedText>
              <ThemedText
                type="small"
                style={styles.subtitle}
                themeColor="textSecondary"
              >
                {isSignin
                  ? 'Sign in to your Hapsteen account'
                  : 'Join Hapsteen to discover people and events near you'}
              </ThemedText>
            </View>

            <View style={styles.modeTabs}>
              <ModeTab
                label="Sign in"
                active={isSignin}
                onPress={() => setMode('signin')}
              />
              <ModeTab
                label="Sign up"
                active={!isSignin}
                onPress={() => setMode('signup')}
              />
            </View>

            <View style={styles.form}>
              {!isSignin && (
                <Field
                  label="Full name"
                  placeholder="Alex Rivera"
                  value={name}
                  onChangeText={setName}
                  leftIcon="person-outline"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
              <Field
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              <Field
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                leftIcon="lock-closed-outline"
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              <View style={styles.forgotRow}>
                {isSignin && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password"
                    onPress={() => {
                      Linking.openURL('https://hapsteen.app/reset-password');
                    }}
                    style={styles.forgotLink}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Forgot password?
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSignin ? 'Sign in' : 'Create account'}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryBtn,
                submitting && { opacity: 0.7 },
                pressed && !submitting && styles.btnPressed,
              ]}
              disabled={submitting || !email || !password}>
              <ThemedText type="smallBold" style={styles.btnText}>
                {submitting
                  ? isSignin
                    ? 'Signing in…'
                    : 'Creating account…'
                  : isSignin
                  ? 'Sign in'
                  : 'Create account'}
              </ThemedText>
            </Pressable>

            <View style={styles.dividerRow}>
              <ThemedView type="backgroundSelected" style={styles.dividerLine} />
              <ThemedText type="small" style={styles.orText} themeColor="textSecondary">
                or
              </ThemedText>
              <ThemedView type="backgroundSelected" style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton
                icon="logo-google"
                label="Google"
                onPress={() => {
                  Alert.alert(
                    'Coming soon',
                    'Google sign-in will be available once Firebase auth is configured.',
                  );
                }}
              />
              <SocialButton
                icon="logo-apple"
                label="Apple"
                onPress={() => {
                  Alert.alert(
                    'Coming soon',
                    'Apple sign-in will be available once Firebase auth is configured.',
                  );
                }}
              />
            </View>

            <View style={styles.footerRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {isSignin ? "Don't have an account? " : 'Already have an account? '}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isSignin ? 'Create account' : 'Sign in'}
                onPress={() => setMode(isSignin ? 'signup' : 'signin')}
                style={styles.switchLink}>
                <ThemedText
                  type="smallBold"
                  style={styles.switchText}
                  themeColor="text"
                >
                  {isSignin ? 'Create account' : 'Sign in'}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function ModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.modeTab, active && styles.modeTabActive, pressed && styles.btnPressed]}>
      <ThemedText type="smallBold" style={[styles.modeTabText, active && styles.modeTabTextActive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  leftIcon,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  returnKeyType?: 'next' | 'go' | 'done';
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <View style={styles.field}>
        {leftIcon && (
          <View style={styles.fieldIcon}>
            <Ionicons name={leftIcon} size={18} color={Brand.inkSecondary} />
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
      </View>
      <ThemedText type="small" style={styles.fieldLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sign in with ${label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.socialBtn, pressed && styles.btnPressed]}>
      <View style={styles.socialIcon}>
        <Ionicons name={icon} size={20} color={Brand.ink} />
      </View>
      <ThemedText type="smallBold" style={styles.socialLabel} themeColor="text">
        {label}
      </ThemedText>
    </Pressable>
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
  keyboardAvoiding: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Spacing.six,
  },
  header: {
    gap: 12,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoDot: {
    color: Brand.lime,
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.line,
    marginVertical: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.inkSecondary,
  },
  modeTabs: {
    flexDirection: 'row',
    marginVertical: 20,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeTabActive: {
    borderBottomColor: Brand.coral,
    borderBottomWidth: 2,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.inkSecondary,
  },
  modeTabTextActive: {
    color: Brand.coral,
  },
  form: {
    gap: 14,
  },
  fieldWrapper: {
    gap: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Brand.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  fieldLabel: {
    marginLeft: 2,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 6,
  },
  forgotLink: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  primaryBtn: {
    backgroundColor: Brand.coral,
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.coral,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontWeight: '700',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.cardBg,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    minHeight: 50,
    gap: 10,
  },
  socialIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLabel: {
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  switchLink: {
    paddingHorizontal: 2,
  },
  switchText: {
    color: Brand.coral,
  },
});
