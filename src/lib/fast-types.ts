export type FastType = 'daniel' | 'partial_day' | 'full_day' | 'non_food';

export type FastTypeInfo = {
  id: FastType;
  name: string;
  rule: string;
  /** Food fasts show the health notice before a member can choose them. */
  involvesFood: boolean;
};

/**
 * Order matters only for display. Every option is presented as an equal way
 * to take part; the non-food fast is never a lesser choice.
 */
export const FAST_TYPES: readonly FastTypeInfo[] = [
  {
    id: 'daniel',
    name: 'Daniel Fast',
    rule: 'Fruit, vegetables, whole grains and water. No meat, sweets or caffeine.',
    involvesFood: true,
  },
  {
    id: 'partial_day',
    name: 'Partial day',
    rule: 'No food from waking until a set time, such as 3pm.',
    involvesFood: true,
  },
  {
    id: 'full_day',
    name: 'Full day',
    rule: 'Water only on the days you choose.',
    involvesFood: true,
  },
  {
    id: 'non_food',
    name: 'Non-food fast',
    rule: 'Give up something else, such as social media or television.',
    involvesFood: false,
  },
];

export function fastTypeInfo(id: FastType): FastTypeInfo {
  const info = FAST_TYPES.find((t) => t.id === id);
  if (!info) throw new Error(`Unknown fast type: ${id}`);
  return info;
}

export const FAST_LENGTHS = [7, 14, 21, 40] as const;
export type FastLength = (typeof FAST_LENGTHS)[number];

/** The reminder times offered when joining and in settings. */
export const REMINDER_TIMES = [
  { time: '06:30', label: 'Early morning' },
  { time: '08:00', label: 'Morning' },
  { time: '12:30', label: 'Midday' },
  { time: '20:00', label: 'Evening' },
] as const;

/** Who should speak to a doctor before a food fast (the health notice). */
export const HEALTH_REASONS = [
  'are pregnant or breastfeeding',
  'have diabetes',
  'take regular medication',
  'are under 18',
  'have a history of disordered eating',
] as const;
