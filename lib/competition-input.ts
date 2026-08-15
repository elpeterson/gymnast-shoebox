import { z } from 'zod';
import { APPARATUSES, type Apparatus } from '@/lib/gymnastics';

const optionalNumber = (value: FormDataEntryValue | null) => {
  const normalized = value?.toString().trim();
  return normalized ? Number(normalized) : null;
};

const optionalInteger = (value: FormDataEntryValue | null) => {
  const normalized = value?.toString().trim();
  return normalized ? Number.parseInt(normalized, 10) : null;
};

const competitionSchema = z.object({
  name: z.string().trim().min(1, 'Competition name is required').max(160),
  level: z.string().trim().max(80).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  allAroundPlace: z.number().int().positive().nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

const scoreSchema = z.object({
  apparatus: z.enum(APPARATUSES),
  value: z.number().min(0).max(100).nullable(),
  place: z.number().int().positive().nullable(),
  startValue: z.number().min(0).max(100).nullable(),
});

export type ParsedCompetitionInput = z.infer<typeof competitionSchema> & {
  scores: z.infer<typeof scoreSchema>[];
};

export function parseCompetitionForm(formData: FormData): ParsedCompetitionInput {
  const details = competitionSchema.parse({
    name: formData.get('name')?.toString() ?? '',
    level: formData.get('level')?.toString().trim() || null,
    startDate: formData.get('start_date')?.toString() || null,
    endDate: formData.get('end_date')?.toString() || null,
    allAroundPlace: optionalInteger(formData.get('all_around_place')),
    notes: formData.get('notes')?.toString().trim() || null,
  });

  if (details.startDate && details.endDate && details.endDate < details.startDate) {
    throw new Error('End date cannot be before the start date.');
  }

  const scores = APPARATUSES.map((apparatus: Apparatus) =>
    scoreSchema.parse({
      apparatus,
      value: optionalNumber(formData.get(apparatus)),
      place: optionalInteger(formData.get(`${apparatus}_place`)),
      startValue: optionalNumber(formData.get(`${apparatus}_sv`)),
    })
  );

  return { ...details, scores };
}
