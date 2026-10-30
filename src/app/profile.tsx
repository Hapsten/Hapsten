import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import { Brand } from '@/constants/theme';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.body} edges={['top']}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Trust comes first — verification, interests, and squads will live here.
        </Text>
      </SafeAreaView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 14, lineHeight: 20, color: Brand.inkSecondary, marginTop: 6 },
});
