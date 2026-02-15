'use client';

import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';
import { MAG_APPARATUS, WAG_APPARATUS } from '@/lib/constants';

interface CompetitionFormProps {
  initialData?: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    level: string | null;
    all_around_place: number | null;
    show_start_value: boolean;
    show_place: boolean;
    scores: {
      apparatus: string;
      value: number | null;
      place: number | null;
      start_value: number | null;
    }[];
  };
  discipline?: string;
}

export function CompetitionForm({
  initialData,
  discipline = 'MAG',
}: CompetitionFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEditing = !!initialData;

  const [showSV, setShowSV] = useState(initialData?.show_start_value ?? false);
  const [showPlace, setShowPlace] = useState(initialData?.show_place ?? true);

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
            isEditing ? 'Competition Updated' : 'Competition Created',
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
    (initialData?.scores || []).find((s) => s.apparatus === app)?.value ?? '';

  const getPlace = (app: string) =>
    (initialData?.scores || []).find((s) => s.apparatus === app)?.place ?? '';

  const getSV = (app: string) =>
    (initialData?.scores || []).find((s) => s.apparatus === app)?.start_value ??
    '';

  const apparatusList = discipline === 'WAG' ? WAG_APPARATUS : MAG_APPARATUS;

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
          <input type="hidden" name="discipline" value={discipline} />

          <input type="hidden" name="show_start_value" value={String(showSV)} />
          <input type="hidden" name="show_place" value={String(showPlace)} />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="grid w-full items-center gap-1.5 sm:col-span-2">
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

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="all_around_place">AA Place (Optional)</Label>
              <Input
                type="number"
                name="all_around_place"
                id="all_around_place"
                min="1"
                placeholder="#"
                className="no-spinners"
                onWheel={(e) => e.currentTarget.blur()}
                defaultValue={initialData?.all_around_place || ''}
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium leading-none">
                Apparatus Scores ({discipline === 'WAG' ? "Women's" : "Men's"})
              </h3>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-sv"
                    checked={showSV}
                    onCheckedChange={setShowSV}
                  />
                  <Label htmlFor="show-sv" className="text-xs">
                    Start Value
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-place"
                    checked={showPlace}
                    onCheckedChange={setShowPlace}
                  />
                  <Label htmlFor="show-place" className="text-xs">
                    Place
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {apparatusList.map((app) => (
                <ScoreInput
                  key={app.id}
                  label={app.label}
                  name={app.id}
                  initVal={getScore(app.id)}
                  initPlace={getPlace(app.id)}
                  initSV={getSV(app.id)}
                  showSV={showSV}
                  showPlace={showPlace}
                />
              ))}
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
  initSV,
  showSV,
  showPlace,
}: {
  label: string;
  name: string;
  initVal: any;
  initPlace: any;
  initSV: any;
  showSV: boolean;
  showPlace: boolean;
}) {
  return (
    <div className="space-y-2 border p-3 rounded-md bg-muted/20">
      <Label className="font-semibold text-primary">{label}</Label>
      <div className="flex gap-2">
        <div
          className={cn('grid w-1/3 items-center gap-1.5', !showSV && 'hidden')}
        >
          <Label
            htmlFor={`${name}_sv`}
            className="text-[10px] text-muted-foreground uppercase"
          >
            Start Val
          </Label>
          <Input
            type="number"
            name={`${name}_sv`}
            id={`${name}_sv`}
            step="0.1"
            min="0"
            placeholder="10.0"
            className="no-spinners px-2 text-center bg-background"
            onWheel={(e) => e.currentTarget.blur()}
            defaultValue={initSV}
          />
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label
            htmlFor={name}
            className="text-[10px] text-muted-foreground uppercase font-bold text-primary"
          >
            Final Score
          </Label>
          <Input
            type="number"
            name={name}
            id={name}
            step="0.001"
            min="0"
            placeholder="0.000"
            className="no-spinners font-bold text-lg h-10 bg-background"
            onWheel={(e) => e.currentTarget.blur()}
            defaultValue={initVal}
          />
        </div>

        <div
          className={cn(
            'grid w-1/3 items-center gap-1.5',
            !showPlace && 'hidden',
          )}
        >
          <Label
            htmlFor={`${name}_place`}
            className="text-[10px] text-muted-foreground uppercase"
          >
            Place
          </Label>
          <Input
            type="number"
            name={`${name}_place`}
            id={`${name}_place`}
            min="1"
            placeholder="#"
            className="no-spinners px-2 text-center bg-background"
            onWheel={(e) => e.currentTarget.blur()}
            defaultValue={initPlace}
          />
        </div>
      </div>
    </div>
  );
}
