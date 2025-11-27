'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { createScore, updateCompetition } from '@/app/(main)/scores/actions';
import { useRouter } from 'next/navigation';

interface CompetitionFormProps {
  initialData?: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    level: string | null;
    scores: { apparatus: string; value: number | null; place: number | null }[];
  };
}

export function CompetitionForm({ initialData }: CompetitionFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEditing = !!initialData;

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        let result;

        if (isEditing && initialData) {
          result = await updateCompetition(initialData.id, formData);
        } else {
          result = await createScore(formData);
        }

        if (result?.error) {
          toast.error('Operation Failed', { description: result.error });
        } else {
          toast.success(
            isEditing ? 'Competition Updated' : 'Competition Created'
          );
          router.push('/dashboard');
          router.refresh();
        }
      } catch (e) {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  const getScore = (app: string) =>
    initialData?.scores.find((s) => s.apparatus === app)?.value ?? '';
  const getPlace = (app: string) =>
    initialData?.scores.find((s) => s.apparatus === app)?.place ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Competition' : 'Add New Competition'}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update the details and scores below.'
            : 'Enter the competition details and scores below.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name">Competition Name</Label>
              <Input
                type="text"
                name="name"
                id="name"
                required
                placeholder="e.g. Winter Cup"
                defaultValue={initialData?.name}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="level">Level (Optional)</Label>
              <Input
                type="text"
                name="level"
                id="level"
                placeholder="e.g. Level 4"
                defaultValue={initialData?.level || ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="start_date">
                Start Date{' '}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </Label>
              <Input
                type="date"
                name="start_date"
                id="start_date"
                defaultValue={initialData?.start_date || ''}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="end_date">
                End Date{' '}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </Label>
              <Input
                type="date"
                name="end_date"
                id="end_date"
                defaultValue={initialData?.end_date || ''}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium leading-none">
              Apparatus Scores
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ScoreInput
                label="Floor Exercise"
                name="floor_exercise"
                initVal={getScore('floor_exercise')}
                initPlace={getPlace('floor_exercise')}
              />
              <ScoreInput
                label="Pommel Horse"
                name="pommel_horse"
                initVal={getScore('pommel_horse')}
                initPlace={getPlace('pommel_horse')}
              />
              <ScoreInput
                label="Still Rings"
                name="still_rings"
                initVal={getScore('still_rings')}
                initPlace={getPlace('still_rings')}
              />
              <ScoreInput
                label="Vault"
                name="vault"
                initVal={getScore('vault')}
                initPlace={getPlace('vault')}
              />
              <ScoreInput
                label="Parallel Bars"
                name="parallel_bars"
                initVal={getScore('parallel_bars')}
                initPlace={getPlace('parallel_bars')}
              />
              <ScoreInput
                label="High Bar"
                name="high_bar"
                initVal={getScore('high_bar')}
                initPlace={getPlace('high_bar')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild disabled={isPending}>
              <a href="/dashboard">Cancel</a>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Saving...'
                : isEditing
                ? 'Update Scores'
                : 'Save Scores'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ScoreInput({
  label,
  name,
  initVal,
  initPlace,
}: {
  label: string;
  name: string;
  initVal: number | string;
  initPlace: number | string;
}) {
  return (
    <div className="space-y-2 border p-3 rounded-md bg-muted/20">
      <Label className="font-semibold text-primary">{label}</Label>
      <div className="flex gap-2">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor={name} className="text-xs text-muted-foreground">
            Score
          </Label>
          <Input
            type="number"
            name={name}
            id={name}
            step="0.001"
            min="0"
            placeholder="0.000"
            className="no-spinners"
            onWheel={(e) => e.currentTarget.blur()}
            defaultValue={initVal}
          />
        </div>
        <div className="grid w-1/3 items-center gap-1.5">
          <Label
            htmlFor={`${name}_place`}
            className="text-xs text-muted-foreground"
          >
            Place
          </Label>
          <Input
            type="number"
            name={`${name}_place`}
            id={`${name}_place`}
            min="1"
            placeholder="#"
            className="no-spinners px-2 text-center"
            onWheel={(e) => e.currentTarget.blur()}
            defaultValue={initPlace}
          />
        </div>
      </div>
    </div>
  );
}
