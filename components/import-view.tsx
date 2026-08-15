'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Check, CloudDownload, Link2, Loader2, RefreshCw } from 'lucide-react';
import { linkMsoAthlete } from '@/app/actions/gymnast';
import {
  fetchMsoMeets,
  syncMsoMeet,
  type MsoMeetSummary,
} from '@/app/actions/mso';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ImportView({
  gymnastName,
  initialMsoId,
}: {
  gymnastName: string;
  initialMsoId?: string | null;
}) {
  const [msoId, setMsoId] = useState(initialMsoId || '');
  const [isLinked, setIsLinked] = useState(Boolean(initialMsoId));
  const [meets, setMeets] = useState<MsoMeetSummary[]>([]);
  const [isPending, startTransition] = useTransition();

  const loadMeets = useCallback(() => {
    startTransition(async () => {
      const result = await fetchMsoMeets();
      if (result.error) toast.error(result.error);
      else if (result.meets) setMeets(result.meets);
    });
  }, []);

  useEffect(() => {
    if (initialMsoId) loadMeets();
  }, [initialMsoId, loadMeets]);

  const linkAndLoad = () => {
    startTransition(async () => {
      const result = await linkMsoAthlete(msoId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setIsLinked(true);
      toast.success(`${gymnastName} is now linked to MSO.`);
      const meetsResult = await fetchMsoMeets();
      if (meetsResult.error) toast.error(meetsResult.error);
      else if (meetsResult.meets) setMeets(meetsResult.meets);
    });
  };

  const syncMeet = (meet: MsoMeetSummary) => {
    startTransition(async () => {
      const result = await syncMsoMeet(meet);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.updated ? 'Meet updated from MSO.' : 'Meet imported from MSO.');
      setMeets((current) =>
        current.map((item) => (item.id === meet.id ? { ...item, isImported: true } : item))
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">MSO Sync</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Import new meets or refresh corrected scores for {gymnastName}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isLinked ? 'MSO account linked' : `Link ${gymnastName} to MSO`}</CardTitle>
          <CardDescription>
            {isLinked
              ? `Athlete ID ${msoId} is saved to ${gymnastName}'s profile.`
              : 'Enter the Athlete ID once. It will be saved and used automatically afterward.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {!isLinked && (
            <div className="grid w-full max-w-sm gap-1.5">
              <Label htmlFor="msoId">Athlete ID</Label>
              <Input
                id="msoId"
                inputMode="numeric"
                value={msoId}
                onChange={(event) => setMsoId(event.target.value)}
              />
            </div>
          )}
          <Button onClick={isLinked ? loadMeets : linkAndLoad} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isLinked ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            {isLinked ? 'Check MSO Now' : 'Link and Sync'}
          </Button>
        </CardContent>
      </Card>

      {meets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>MSO Meets</CardTitle>
            <CardDescription>
              Imported meets can be refreshed when MSO posts corrections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {meets.map((meet) => (
              <div key={meet.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <h3 className="font-semibold">{meet.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {meet.dateStr} · Level {meet.level || 'TBD'}
                  </p>
                </div>
                <Button
                  variant={meet.isImported ? 'outline' : 'default'}
                  onClick={() => syncMeet(meet)}
                  disabled={isPending}
                >
                  {meet.isImported ? (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  ) : (
                    <CloudDownload className="mr-2 h-4 w-4" />
                  )}
                  {meet.isImported ? 'Refresh' : 'Import'}
                </Button>
              </div>
            ))}
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" /> Your meet notes are preserved during refreshes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
