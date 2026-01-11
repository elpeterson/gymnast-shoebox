'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchMsoMeets,
  importMsoMeet,
  type MsoMeetSummary,
} from '@/app/actions/mso';
import { toast } from 'sonner';
import { Check, CloudDownload, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [msoId, setMsoId] = useState('');
  const [meets, setMeets] = useState<MsoMeetSummary[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSync = () => {
    if (!msoId) {
      toast.error('Please enter an MSO ID');
      return;
    }

    startTransition(async () => {
      const result = await fetchMsoMeets(msoId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.meets) {
        setMeets(result.meets);
        toast.success(`Found ${result.meets.length} meets`);
      }
    });
  };

  const handleImport = async (meet: MsoMeetSummary) => {
    toast.info(`Importing ${meet.name}...`);
    const result = await importMsoMeet(meet);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Meet Imported Successfully!');
      setMeets((prev) =>
        prev.map((m) => (m.id === meet.id ? { ...m, isImported: true } : m))
      );
      router.refresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Import from MSO</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Configuration</CardTitle>
          <CardDescription>
            Enter your Athlete ID to fetch meets from MeetScoresOnline.com
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="msoId">Athlete ID</Label>
            <Input
              id="msoId"
              placeholder="1184668"
              value={msoId}
              onChange={(e) => setMsoId(e.target.value)}
            />
          </div>
          <Button onClick={handleSync} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="mr-2 h-4 w-4" />
            )}
            Sync Meets
          </Button>
        </CardContent>
      </Card>

      {meets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Meets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meets.map((meet) => (
                <div
                  key={meet.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/10"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg leading-none">
                      {meet.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Level {meet.level}
                    </p>
                  </div>

                  {meet.isImported ? (
                    <Button
                      variant="outline"
                      disabled
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <Check className="mr-2 h-4 w-4" /> Imported
                    </Button>
                  ) : (
                    <Button onClick={() => handleImport(meet)}>Import</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
