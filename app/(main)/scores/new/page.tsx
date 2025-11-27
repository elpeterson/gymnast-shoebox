'use client';

import { createScore } from '../actions';
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
import { useTransition } from 'react';

export default function AddScorePage() {
  const [isPending, startTransition] = useTransition();
  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await createScore(formData);

        if (result?.error) {
          toast.error('Save Failed', {
            description: result.error,
          });
        } else {
          toast.success('Score Saved!');
        }
      } catch (e) {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Add New Competition</CardTitle>
          <CardDescription>
            Enter the competition details and scores below.
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
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="level">Level (Optional)</Label>
                <Input
                  type="text"
                  name="level"
                  id="level"
                  placeholder="e.g. Level 4"
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
                <Input type="date" name="start_date" id="start_date" />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="end_date">
                  End Date{' '}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </Label>
                <Input type="date" name="end_date" id="end_date" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Apparatus Scores
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <ScoreInput label="Floor Exercise" name="floor_exercise" />
                <ScoreInput label="Pommel Horse" name="pommel_horse" />
                <ScoreInput label="Still Rings" name="still_rings" />
                <ScoreInput label="Vault" name="vault" />
                <ScoreInput label="Parallel Bars" name="parallel_bars" />
                <ScoreInput label="High Bar" name="high_bar" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild disabled={isPending}>
                <a href="/dashboard">Cancel</a>
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Scores'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreInput({ label, name }: { label: string; name: string }) {
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
          />
        </div>
      </div>
    </div>
  );
}