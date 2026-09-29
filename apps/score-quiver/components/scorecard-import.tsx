'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowChip } from '@/components/arrow-chip';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { extractTextItems } from '@/lib/scorecard/extract';
import { parseScorecard } from '@/lib/scorecard/parse';
import type { ParsedScorecard } from '@/lib/scorecard/types';
import { BOW_STYLE_LABELS, parseDivision } from '@/lib/division';
import { formatDate } from '@/lib/format';
import { saveScorecard, type ImportPayload } from '@/app/(main)/import/actions';

export type SetupDefaults = Record<
  string,
  { distance_m: number | null; face_cm: number | null }
>;

type Setup = {
  environment: 'indoor' | 'outdoor';
  bowStyle: string;
  distance: string;
  face: string;
};

type Entry = {
  key: string;
  file: File;
  status: 'parsing' | 'ready' | 'invalid' | 'saving' | 'saved' | 'duplicate';
  hash?: string;
  card?: ParsedScorecard;
  setup?: Setup;
  eventId?: string;
  message?: string;
};

const FACES = ['40', '60', '80', '122'];

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
function loadPdfJs() {
  pdfjsPromise ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

function defaultSetup(card: ParsedScorecard, defaults: SetupDefaults): Setup {
  // 3-arrow ends are the indoor format; 6-arrow ends are outdoor.
  const environment = card.arrowsPerEnd === 3 ? 'indoor' : 'outdoor';
  const bowStyle = parseDivision(card.division).bowStyle ?? '';
  const remembered = defaults[`${environment}|${bowStyle}`];
  const distance =
    remembered?.distance_m ?? (environment === 'indoor' ? 18 : null);
  return {
    environment,
    bowStyle,
    distance: distance != null ? String(distance) : '',
    face: remembered?.face_cm != null ? String(remembered.face_cm) : '',
  };
}

export function ScorecardImport({
  archer,
  userId,
  setupDefaults,
  existingHashes,
}: {
  archer: { id: string; name: string };
  userId: string;
  setupDefaults: SetupDefaults;
  existingHashes: string[];
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const known = useRef(new Set(existingHashes));

  const update = (key: string, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const pdfs = [...files].filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      );
      if (pdfs.length < [...files].length) {
        toast.error('Only PDF scorecards can be imported.');
      }

      const fresh: Entry[] = pdfs.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        status: 'parsing',
      }));
      setEntries((prev) => [...fresh, ...prev]);

      const pdfjs = await loadPdfJs();
      for (const entry of fresh) {
        try {
          const buffer = await entry.file.arrayBuffer();
          const hash = await sha256(buffer);
          if (known.current.has(hash)) {
            update(entry.key, {
              status: 'duplicate',
              hash,
              message: `Already imported for ${archer.name}.`,
            });
            continue;
          }
          // pdf.js detaches the buffer it is given, so hand it a copy.
          const items = await extractTextItems(pdfjs, buffer.slice(0));
          const card = parseScorecard(items);
          const hasErrors = card.issues.some((i) => i.level === 'error');
          update(entry.key, {
            status: hasErrors ? 'invalid' : 'ready',
            hash,
            card,
            setup: hasErrors ? undefined : defaultSetup(card, setupDefaults),
          });
        } catch (err) {
          update(entry.key, {
            status: 'invalid',
            message: `Couldn't read this PDF (${(err as Error).message}).`,
          });
        }
      }
    },
    [archer.name, setupDefaults],
  );

  const save = async (entry: Entry) => {
    const { card, setup, hash } = entry;
    if (!card || !setup || !hash) return;
    update(entry.key, { status: 'saving' });

    const supabase = createClient();
    const path = `${userId}/${archer.id}/${hash}.pdf`;
    const upload = await supabase.storage
      .from('scorecards')
      .upload(path, entry.file, { contentType: 'application/pdf' });
    // An earlier attempt may have uploaded the file already; that's fine.
    const uploaded =
      !upload.error || /exists|duplicate/i.test(upload.error.message);

    const payload: ImportPayload = {
      event: {
        archer_id: archer.id,
        name: card.eventName,
        venue: card.venue,
        start_date: card.startDate,
        end_date: card.endDate,
        shot_on: card.sessionDate,
        session: card.sessionLabel,
        target: card.target,
        division: card.division,
        bow_style: setup.bowStyle || null,
        environment: setup.environment,
        distance_m: setup.distance ? Number(setup.distance) : null,
        face_cm: setup.face ? Number(setup.face) : null,
        arrows_per_end: card.arrowsPerEnd,
        bonus_labels: card.bonusLabels.filter(Boolean),
        source_path: uploaded ? path : null,
        source_hash: hash,
        name_on_card: card.archerName,
      },
      rounds: card.rounds.map((r) => ({
        round_number: r.roundNumber,
        total: r.total,
        bonus: r.bonus,
        ends: r.ends.map((e) => ({ end_number: e.endNumber, arrows: e.arrows })),
      })),
    };

    const result = await saveScorecard(payload);
    if (result.duplicate) {
      known.current.add(hash);
      update(entry.key, { status: 'duplicate', message: `Already imported for ${archer.name}.` });
    } else if (result.error) {
      update(entry.key, { status: 'ready', message: result.error });
      toast.error('Save failed', { description: result.error });
    } else {
      known.current.add(hash);
      update(entry.key, { status: 'saved', eventId: result.id, message: undefined });
      toast.success(`Saved ${card.eventName}`);
    }
  };

  const ready = entries.filter((e) => e.status === 'ready');

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
        )}
      >
        <FileUp className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Drop scorecard PDFs here</p>
        <p className="text-sm text-muted-foreground">or click to choose files</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {ready.length > 1 && (
        <div className="flex justify-end">
          <Button onClick={() => ready.forEach(save)}>
            Save all {ready.length}
          </Button>
        </div>
      )}

      {entries.map((entry) => (
        <EntryCard
          key={entry.key}
          entry={entry}
          archerName={archer.name}
          onSetup={(setup) => update(entry.key, { setup })}
          onSave={() => save(entry)}
          onRemove={() =>
            setEntries((prev) => prev.filter((e) => e.key !== entry.key))
          }
        />
      ))}
    </div>
  );
}

function EntryCard({
  entry,
  archerName,
  onSetup,
  onSave,
  onRemove,
}: {
  entry: Entry;
  archerName: string;
  onSetup: (setup: Setup) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const { card, setup, status } = entry;

  if (status === 'parsing') {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-5 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading {entry.file.name}…
        </CardContent>
      </Card>
    );
  }

  const nameMismatch =
    card?.archerName &&
    card.archerName.trim().toLowerCase() !== archerName.trim().toLowerCase();
  const errors = card?.issues.filter((i) => i.level === 'error') ?? [];
  const warnings = card?.issues.filter((i) => i.level === 'warning') ?? [];

  return (
    <Card className={cn(status === 'saved' && 'border-primary/40')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg truncate">
              {card?.eventName || entry.file.name}
            </CardTitle>
            {card && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(card.sessionDate)} · {card.venue ?? 'Unknown venue'}
                {card.division && ` · ${card.division}`}
                {card.target && ` · Target ${card.target}`}
              </p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {entry.message && (
          <p className="text-sm text-muted-foreground">{entry.message}</p>
        )}

        {errors.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <p className="font-medium">This scorecard doesn&apos;t add up, so it wasn&apos;t imported:</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </div>
        )}

        {card && errors.length === 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {card.rounds.map((r) => (
                <div key={r.roundNumber} className="rounded-md border p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">Round {r.roundNumber}</span>
                    <span className="text-xl font-bold tabular-nums">{r.total}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-0.5">
                    {r.ends.flatMap((e) => e.arrows).map((a, i) => (
                      <ArrowChip key={i} value={a} className="h-5 w-5 text-[10px]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {(nameMismatch || warnings.length > 0) && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" /> Check before saving
                </div>
                <ul className="mt-1 list-disc pl-5">
                  {nameMismatch && (
                    <li>
                      This card is for <strong>{card.archerName}</strong>, but
                      you&apos;re importing into <strong>{archerName}</strong>.
                    </li>
                  )}
                  {warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {setup && status !== 'saved' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Setup{' '}
                  <span className="font-normal text-muted-foreground">
                    — not printed on the card; used to compare like with like
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Where</Label>
                    <Select
                      value={setup.environment}
                      onValueChange={(v) =>
                        onSetup({ ...setup, environment: v as Setup['environment'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indoor">Indoor</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bow</Label>
                    <Select
                      value={setup.bowStyle}
                      onValueChange={(v) => onSetup({ ...setup, bowStyle: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Bow style" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BOW_STYLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Distance (m)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      className="no-spinners"
                      value={setup.distance}
                      placeholder="e.g. 30"
                      onChange={(e) => onSetup({ ...setup, distance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Face (cm)</Label>
                    <Select
                      value={setup.face}
                      onValueChange={(v) => onSetup({ ...setup, face: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Face size" />
                      </SelectTrigger>
                      <SelectContent>
                        {FACES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f} cm
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2">
          {status === 'saved' && entry.eventId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/events/${entry.eventId}`}>View scorecard</Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              {status === 'ready' ? 'Skip' : 'Dismiss'}
            </Button>
          )}
          {(status === 'ready' || status === 'saving') && (
            <Button size="sm" onClick={onSave} disabled={status === 'saving'}>
              {status === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save scorecard
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Entry['status'] }) {
  const map = {
    ready: { icon: CheckCircle2, text: 'Checks out', cls: 'text-primary' },
    saving: { icon: Loader2, text: 'Saving', cls: 'text-muted-foreground' },
    saved: { icon: CheckCircle2, text: 'Saved', cls: 'text-primary' },
    duplicate: { icon: AlertTriangle, text: 'Duplicate', cls: 'text-amber-600' },
    invalid: { icon: XCircle, text: 'Not imported', cls: 'text-red-600' },
    parsing: { icon: Loader2, text: 'Reading', cls: 'text-muted-foreground' },
  } as const;
  const { icon: Icon, text, cls } = map[status];
  return (
    <span className={cn('flex shrink-0 items-center gap-1 text-xs font-medium', cls)}>
      <Icon className={cn('h-4 w-4', status === 'saving' && 'animate-spin')} />
      {text}
    </span>
  );
}
