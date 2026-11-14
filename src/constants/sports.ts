import type { SportId } from '@/types/models';

export type SportConfig = {
  id: SportId;
  label: string;
  emoji: string;
  /** Minimum players for a real game. */
  minPlayers: number;
  /** Maximum players we put in one squad. */
  capacity: number;
  defaultDurationMin: number;
  defaultRadiusKm: number;
};

export const SPORTS: SportConfig[] = [
  {
    id: 'badminton',
    label: 'Badminton',
    emoji: '🏸',
    minPlayers: 2,
    capacity: 4,
    defaultDurationMin: 120,
    defaultRadiusKm: 10,
  },
  {
    id: 'tennis',
    label: 'Tennis',
    emoji: '🎾',
    minPlayers: 2,
    capacity: 4,
    defaultDurationMin: 90,
    defaultRadiusKm: 10,
  },
  {
    id: 'football',
    label: 'Football',
    emoji: '⚽',
    minPlayers: 6,
    capacity: 10,
    defaultDurationMin: 90,
    defaultRadiusKm: 15,
  },
  {
    id: 'basketball',
    label: 'Basketball',
    emoji: '🏀',
    minPlayers: 6,
    capacity: 10,
    defaultDurationMin: 90,
    defaultRadiusKm: 10,
  },
  {
    id: 'cricket',
    label: 'Cricket',
    emoji: '🏏',
    minPlayers: 8,
    capacity: 12,
    defaultDurationMin: 120,
    defaultRadiusKm: 20,
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    emoji: '🥎',
    minPlayers: 2,
    capacity: 4,
    defaultDurationMin: 90,
    defaultRadiusKm: 10,
  },
];

export function getSport(id: SportId): SportConfig {
  return SPORTS.find((sport) => sport.id === id) ?? SPORTS[0];
}

export const RADIUS_OPTIONS = [3, 5, 10, 25] as const;

export const SKILL_OPTIONS: { value: 'any' | 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
  { value: 'any', label: 'Any level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
