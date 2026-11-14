import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChoiceChips } from '@/components/choice-chips';
import { RADIUS_OPTIONS, SKILL_OPTIONS, SPORTS, getSport } from '@/constants/sports';
import { Brand } from '@/constants/theme';
import {
  clampStartMinutes,
  DURATION_OPTIONS,
  dayOptions,
  formatMinutes,
  MAX_START_MIN,
  MIN_START_MIN,
  TIME_STEP_MIN,
} from '@/lib/plan-time';
import type { SkillLevel, SportId } from '@/types/models';

export type PlanFormValue = {
  sport: SportId;
  dayOffset: number;
  startMinutes: number;
  durationMin: number;
  radiusKm: number;
  skillLevel: SkillLevel;
};

type PlanFormProps = {
  value: PlanFormValue;
  onChange: (patch: Partial<PlanFormValue>) => void;
};

export function PlanForm({ value, onChange }: PlanFormProps) {
  const days = dayOptions(5);
  const sport = getSport(value.sport);
  const endMinutes = value.startMinutes + value.durationMin;

  return (
    <View style={styles.form}>
      <ChoiceChips
        label="Sport"
        value={value.sport}
        options={SPORTS.map((item) => ({
          value: item.id,
          label: item.label,
          emoji: item.emoji,
        }))}
        onChange={(sportId) => {
          const next = getSport(sportId);
          onChange({
            sport: sportId,
            durationMin: next.defaultDurationMin,
            radiusKm: next.defaultRadiusKm,
          });
        }}
      />

      <ChoiceChips
        label="Day"
        value={value.dayOffset}
        options={days.map((day) => ({ value: day.offset, label: day.label }))}
        onChange={(dayOffset) => onChange({ dayOffset })}
      />

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Start time</Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Earlier start time"
            disabled={value.startMinutes <= MIN_START_MIN}
            onPress={() =>
              onChange({
                startMinutes: clampStartMinutes(value.startMinutes - TIME_STEP_MIN),
              })
            }
            style={({ pressed }) => [
              styles.stepButton,
              value.startMinutes <= MIN_START_MIN && styles.stepButtonDisabled,
              pressed && styles.pressed,
            ]}>
            <Ionicons name="remove" size={18} color={Brand.ink} />
          </Pressable>

          <View style={styles.timeValue}>
            <Text style={styles.timeText}>{formatMinutes(value.startMinutes)}</Text>
            <Text style={styles.timeEnd}>
              ends {formatMinutes(endMinutes % (24 * 60))}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Later start time"
            disabled={value.startMinutes >= MAX_START_MIN}
            onPress={() =>
              onChange({
                startMinutes: clampStartMinutes(value.startMinutes + TIME_STEP_MIN),
              })
            }
            style={({ pressed }) => [
              styles.stepButton,
              value.startMinutes >= MAX_START_MIN && styles.stepButtonDisabled,
              pressed && styles.pressed,
            ]}>
            <Ionicons name="add" size={18} color={Brand.ink} />
          </Pressable>
        </View>
      </View>

      <ChoiceChips
        label="Duration"
        value={value.durationMin}
        options={DURATION_OPTIONS.map((minutes) => ({
          value: minutes,
          label: minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`,
        }))}
        onChange={(durationMin) => onChange({ durationMin })}
      />

      <ChoiceChips
        label="Search radius"
        value={value.radiusKm}
        options={RADIUS_OPTIONS.map((km) => ({ value: km, label: `${km} km` }))}
        onChange={(radiusKm) => onChange({ radiusKm })}
      />

      <ChoiceChips
        label="Skill level"
        value={value.skillLevel}
        options={SKILL_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onChange={(skillLevel) => onChange({ skillLevel })}
      />

      <View style={styles.hint}>
        <Ionicons name="people-outline" size={15} color={Brand.ink} />
        <Text style={styles.hintText}>
          {sport.label} squads need at least {sport.minPlayers} players, up to{' '}
          {sport.capacity}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 18,
  },
  block: {
    gap: 8,
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#A8A39A',
    textTransform: 'uppercase',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Brand.iconChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  timeValue: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.ink,
  },
  timeEnd: {
    fontSize: 12,
    color: Brand.inkSecondary,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.limeSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#4A4A3A',
  },
});
