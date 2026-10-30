'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const arrow = z.enum(['X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M']);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

const ImportSchema = z.object({
  event: z.object({
    archer_id: z.string().uuid(),
    name: z.string().min(1),
    venue: z.string().nullable(),
    start_date: isoDate,
    end_date: isoDate,
    shot_on: isoDate,
    session: z.string().nullable(),
    target: z.string().nullable(),
    division: z.string().nullable(),
    bow_style: z.string().nullable(),
    environment: z.enum(['indoor', 'outdoor']),
    distance_m: z.number().positive().nullable(),
    face_cm: z.number().int().positive().nullable(),
    arrows_per_end: z.number().int().min(1).max(12),
    bonus_labels: z.array(z.string()),
    source_path: z.string().nullable(),
    source_hash: z.string().regex(/^[0-9a-f]{64}$/),
    name_on_card: z.string().nullable(),
  }),
  rounds: z
    .array(
      z.object({
        round_number: z.number().int().positive(),
        total: z.number().int().min(0),
        bonus: z.array(z.number().int().min(0)),
        ends: z
          .array(
            z.object({
              end_number: z.number().int().positive(),
              arrows: z.array(arrow).min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type ImportPayload = z.infer<typeof ImportSchema>;

export async function saveScorecard(
  payload: ImportPayload,
): Promise<{ id?: string; duplicate?: boolean; error?: string }> {
  const parsed = ImportSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: 'This scorecard has invalid data and was not saved.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('import_scorecard', {
    payload: parsed.data,
  });

  if (error) {
    if (error.code === '23505') return { duplicate: true };
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/insights');
  return { id: data as string };
}
