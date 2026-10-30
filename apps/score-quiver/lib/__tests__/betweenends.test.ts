import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { arrowPoints, decodeArrows, toArrow } from '@/lib/betweenends/arrows';
import { normaliseAlt, rankingEntries } from '@/lib/betweenends/entries';
import { createBeClient, isAllowedPath } from '@/lib/betweenends/client';
import type { BeRankingEvent, BeRankingScores } from '@/lib/betweenends/types';
import { computeEventStats, type EventRow } from '@/lib/stats';

// Synthetic event shaped like a live response; names and numbers are made up.
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'betweenends-ranking.json'), 'utf8'),
) as { event: BeRankingEvent; scores: BeRankingScores };

const indoor = { rounds: 2, endsPerRound: 2, arrowsPerEnd: 3 };

describe('arrow characters', () => {
  it('maps the site table to points', () => {
    expect(arrowPoints('T')).toBe(10);
    expect(arrowPoints('X')).toBe(10);
    expect(arrowPoints('M')).toBe(0);
    expect(arrowPoints('7')).toBe(7);
    expect(arrowPoints('a')).toBe(11);
    expect(arrowPoints('W')).toBe(5);
    expect(arrowPoints('E')).toBe(0);
    expect(arrowPoints('?')).toBeNull();
  });

  it('converts to Score Quiver arrows', () => {
    expect(['T', 'X', 'M', '0', '9', 'a'].map(toArrow)).toEqual(['10', 'X', 'M', 'M', '9', '11']);
  });
});

describe('decodeArrows', () => {
  it('splits a complete string into rounds and ends', () => {
    const d = decodeArrows('T98T97987M76', indoor);
    expect(d.rounds.map((r) => r.total)).toEqual([53, 37]);
    expect(d.rounds[1].ends[1]).toEqual({ end_number: 2, arrows: ['M', '7', '6'] });
    expect(d.total).toBe(90);
    expect(d).toMatchObject({ arrowsShot: 12, scheduledArrows: 12, complete: true, standard: true });
    expect(d.shootOff).toEqual([]);
  });

  it('drops unshot arrows and marks the entry incomplete', () => {
    const d = decodeArrows('T98765EEEEEE', indoor);
    expect(d.rounds[0].ends).toHaveLength(2);
    expect(d.rounds[1]).toMatchObject({ total: 0, complete: false, ends: [] });
    expect(d).toMatchObject({ total: 45, arrowsShot: 6, complete: false });
  });

  it('keeps a partly shot end', () => {
    const d = decodeArrows('T9E', { rounds: 1, endsPerRound: 1, arrowsPerEnd: 3 });
    expect(d.rounds[0].ends[0].arrows).toEqual(['10', '9']);
    expect(d.complete).toBe(false);
  });

  it('lets a round-total override win over the arrow sum', () => {
    const d = decodeArrows('TTTTT9TTT999', indoor, '|55');
    expect(d.rounds.map((r) => r.total)).toEqual([59, 55]);
    expect(d.total).toBe(114);
  });

  it('separates shoot-off arrows and flags non-standard faces', () => {
    const d = decodeArrows('XT9MMMa98TX5T', indoor);
    expect(d.shootOff).toEqual(['10']);
    expect(d.total).toBe(29 + 53);
    expect(d.standard).toBe(false);
  });

  it('treats a missing string as nothing shot', () => {
    expect(decodeArrows(undefined, indoor)).toMatchObject({ total: 0, arrowsShot: 0, complete: false });
  });

  it('reports characters outside the table', () => {
    expect(decodeArrows('T9?', { rounds: 1, endsPerRound: 1, arrowsPerEnd: 3 }).unknown).toEqual(['?']);
  });
});

describe('normaliseAlt', () => {
  it.each([
    ['123456', '123456'],
    [' 123456', '123456'],
    ['123456C', '123456'],
    ['N/A', null],
    ['', null],
    [null, null],
  ])('%j -> %j', (raw, expected) => {
    expect(normaliseAlt(raw)).toBe(expected);
  });
});

describe('rankingEntries', () => {
  const entries = rankingEntries(6845, fixture.event, fixture.scores);
  const byAid = new Map(entries.map((e) => [e.aid, e]));

  it('returns one row per entry keyed on the requested event id', () => {
    expect(entries).toHaveLength(4);
    expect(entries.every((e) => e.eventId === 6845)).toBe(true);
  });

  it('links the membership number, division and session', () => {
    expect(byAid.get(9001)).toMatchObject({
      archerId: '123456',
      altRaw: ' 123456C',
      firstName: 'Alex',
      divisionCode: 'RU13W',
      divisionName: 'Recurve U13 (Bowman) Women',
      targets: ['5B'],
      sessions: ['Example Range, Saturday 9am'],
    });
    expect(byAid.get(9001)!.decoded.total).toBe(90);
  });

  it('leaves entries without a number unlinked', () => {
    expect(byAid.get(9002)!.archerId).toBeNull();
    expect(byAid.get(9004)).toMatchObject({ archerId: null, divisionName: null, sessions: [] });
  });

  it('applies round-total overrides', () => {
    expect(byAid.get(9002)!.decoded.total).toBe(114);
  });

  it('marks only 10-ring rules with standard arrows as comparable', () => {
    expect(byAid.get(9001)!.tenRing).toBe(true);
    expect(byAid.get(9004)!.tenRing).toBe(false); // 3-D 11 in the arrows
    const field = rankingEntries(6845, { ...fixture.event, srl: 3 }, fixture.scores);
    expect(field.some((e) => e.tenRing)).toBe(false);
  });

  it('copes with an event that has no scores yet', () => {
    const empty = rankingEntries(6845, fixture.event, null);
    expect(empty.every((e) => e.arrows === '' && e.decoded.arrowsShot === 0)).toBe(true);
  });

  it('feeds the existing stats unchanged', () => {
    const e = byAid.get(9001)!;
    const row: EventRow = {
      id: `be-${e.eventId}-${e.aid}`,
      name: fixture.event.tnm,
      shot_on: null,
      start_date: '2026-10-23',
      bow_style: 'recurve',
      environment: 'indoor',
      distance_m: 18,
      face_cm: 60,
      arrows_per_end: e.arrowsPerEnd,
      rounds: e.decoded.rounds,
    };
    const stats = computeEventStats(row);
    expect(stats.total).toBe(90);
    expect(stats.arrowCount).toBe(12);
    expect(stats.misses).toBe(1);
    expect(stats.roundTotals).toEqual([53, 37]);
  });
});

describe('client', () => {
  function json(body: unknown, init: ResponseInit = {}) {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json', etag: 'W/"abc"' },
      ...init,
    });
  }

  function setup(responses: (() => Response | Promise<Response>)[]) {
    const fetchMock = vi.fn(async () => responses.shift()!());
    let clock = 0;
    const sleeps: number[] = [];
    const client = createBeClient({
      fetch: fetchMock as unknown as typeof fetch,
      minIntervalMs: 1000,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
      now: () => clock,
    });
    return { client, fetchMock, sleeps };
  }

  it('allowlists only the read paths', () => {
    expect(isAllowedPath('/tournaments/')).toBe(true);
    expect(isAllowedPath('/tournaments/3793')).toBe(true);
    expect(isAllowedPath('/events')).toBe(true);
    expect(isAllowedPath('/events/6845/scores')).toBe(true);
    expect(isAllowedPath('/events/6845/scores/1')).toBe(false);
    expect(isAllowedPath('/archers/1')).toBe(false);
    expect(isAllowedPath('/tournaments/1?x=1')).toBe(false);
  });

  it('rejects ids that are not positive integers', () => {
    const { client } = setup([]);
    expect(() => client.event(-1)).toThrow(/Invalid/);
    expect(() => client.event(1.5)).toThrow(/Invalid/);
  });

  it('returns data with its etag and sends If-None-Match', async () => {
    const { client, fetchMock } = setup([
      () => json({ id: 3793, events: [] }),
      () => new Response(null, { status: 304 }),
    ]);
    const first = await client.tournament(3793);
    expect(first).toEqual({ status: 'ok', data: { id: 3793, events: [] }, etag: 'W/"abc"' });
    const second = await client.tournament(3793, 'W/"abc"');
    expect(second).toEqual({ status: 'not-modified', etag: 'W/"abc"' });
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('https://resultsapi.herokuapp.com/tournaments/3793');
    expect((init.headers as Record<string, string>)['If-None-Match']).toBe('W/"abc"');
  });

  it('maps 404 to not-found without retrying', async () => {
    const { client, fetchMock } = setup([() => new Response('', { status: 404 })]);
    expect(await client.event(1)).toEqual({ status: 'not-found' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries 5xx and network errors, then succeeds', async () => {
    const { client, fetchMock } = setup([
      () => new Response('', { status: 503 }),
      () => Promise.reject(new TypeError('fetch failed')),
      () => json({ ars: {} }),
    ]);
    expect(await client.eventScores(6845)).toMatchObject({ status: 'ok', data: { ars: {} } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('gives up after the last attempt', async () => {
    const { client } = setup([
      () => new Response('', { status: 503 }),
      () => new Response('', { status: 503 }),
      () => new Response('', { status: 503 }),
    ]);
    await expect(client.events()).rejects.toThrow(/HTTP 503/);
  });

  it('spaces requests, including concurrent ones', async () => {
    const { client, sleeps } = setup([() => json([]), () => json([]), () => json([])]);
    await Promise.all([client.tournaments(), client.events(), client.tournaments()]);
    expect(sleeps).toEqual([1000, 1000]);
  });
});
