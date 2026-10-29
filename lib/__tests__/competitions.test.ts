import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { insertCompetitionWithScores } from '../competitions';

type Call = { table: string; op: string; payload?: unknown; id?: unknown };

/** Minimal stand-in for the query builder chains the helper uses. */
function fakeSupabase(opts: { compError?: boolean; scoresError?: boolean }) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push({ table, op: 'insert', payload });
          if (table === 'competitions') {
            return {
              select: () => ({
                single: async () =>
                  opts.compError
                    ? { data: null, error: { message: 'boom' } }
                    : { data: { id: 'comp-1' }, error: null },
              }),
            };
          }
          return Promise.resolve({ error: opts.scoresError ? { message: 'boom' } : null });
        },
        delete() {
          return {
            eq: async (_col: string, id: unknown) => {
              calls.push({ table, op: 'delete', id });
              return { error: null };
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const comp = { name: 'Meet', gymnast_id: 'g1', user_id: 'u1' };
const scores = [{ apparatus: 'vault', value: 13.5, place: 2 }];

describe('insertCompetitionWithScores', () => {
  it('inserts the competition then its scores with the new id', async () => {
    const { client, calls } = fakeSupabase({});
    const result = await insertCompetitionWithScores(client, comp, scores);

    expect(result).toEqual({ competitionId: 'comp-1' });
    expect(calls.map((c) => `${c.op}:${c.table}`)).toEqual([
      'insert:competitions',
      'insert:scores',
    ]);
    expect(calls[1].payload).toEqual([{ ...scores[0], competition_id: 'comp-1' }]);
  });

  it('deletes the competition when the scores insert fails', async () => {
    const { client, calls } = fakeSupabase({ scoresError: true });
    const result = await insertCompetitionWithScores(client, comp, scores);

    expect(result).toEqual({ error: 'scores' });
    expect(calls.at(-1)).toEqual({ table: 'competitions', op: 'delete', id: 'comp-1' });
  });

  it('stops without touching scores when the competition insert fails', async () => {
    const { client, calls } = fakeSupabase({ compError: true });
    const result = await insertCompetitionWithScores(client, comp, scores);

    expect(result).toEqual({ error: 'competition' });
    expect(calls).toHaveLength(1);
  });

  it('keeps a competition with no scores', async () => {
    const { client, calls } = fakeSupabase({});
    const result = await insertCompetitionWithScores(client, comp, []);

    expect(result).toEqual({ competitionId: 'comp-1' });
    expect(calls).toHaveLength(1);
  });
});
