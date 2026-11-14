import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

export type Choice<T extends string | number> = {
  value: T;
  label: string;
  emoji?: string;
};

type ChoiceChipsProps<T extends string | number> = {
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function ChoiceChips<T extends string | number>({
  label,
  value,
  options,
  onChange,
  accessibilityLabel,
}: ChoiceChipsProps<T>) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`${accessibilityLabel ?? label}: ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}>
              {option.emoji ? <Text style={styles.emoji}>{option.emoji}</Text> : null}
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#A8A39A',
    textTransform: 'uppercase',
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: Brand.ink,
    borderColor: Brand.ink,
  },
  chipPressed: {
    opacity: 0.85,
  },
  emoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.ink,
  },
  chipTextSelected: {
    color: '#fff',
  },
});
