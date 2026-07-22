import type { AppColors } from '@/constants/theme';
import {
  TYPE_ABSENCE_BIRTH,
  TYPE_ABSENCE_BUSINESS,
  TYPE_ABSENCE_HELPMATE,
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
} from '@/constants/types';

// Icon-circle background accent per absence type, shared by every absence
// list/detail so the colour coding stays consistent across the module. Colours
// are Flat UI "Defo" swatches (see constants/theme.ts):
//   Sick → Peter River · Business → Amethyst · Relax → Turquoise · Birth → Prunus Avium
const ABSENCE_TYPE_ACCENT: Record<string, keyof AppColors> = {
  [TYPE_ABSENCE_SICK]: 'peterRiver',
  [TYPE_ABSENCE_BUSINESS]: 'amethyst',
  [TYPE_ABSENCE_RELAX]: 'turquoise',
  [TYPE_ABSENCE_BIRTH]: 'prunusAvium',
  [TYPE_ABSENCE_HELPMATE]: 'prunusAvium',
};

/** Palette token (key of AppColors) for an absence type's icon-circle background. */
export function getAbsenceTypeAccent(type: string): keyof AppColors {
  return ABSENCE_TYPE_ACCENT[type] ?? 'concrete';
}
