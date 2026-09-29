'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BOW_STYLE_LABELS } from '@/lib/division';
import { deleteEvent, updateEventSetup } from '@/app/(main)/events/[id]/actions';

type Setup = {
  environment: 'indoor' | 'outdoor';
  bow_style: string | null;
  distance_m: number | null;
  face_cm: number | null;
};

export function EventActions({ eventId, setup }: { eventId: string; setup: Setup }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [environment, setEnvironment] = useState(setup.environment);
  const [bowStyle, setBowStyle] = useState(setup.bow_style ?? '');
  const [distance, setDistance] = useState(setup.distance_m?.toString() ?? '');
  const [face, setFace] = useState(setup.face_cm?.toString() ?? '');

  const handleSave = () =>
    startTransition(async () => {
      const result = await updateEventSetup(eventId, {
        environment,
        bow_style: bowStyle || null,
        distance_m: distance ? Number(distance) : null,
        face_cm: face ? Number(face) : null,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success('Setup updated');
        setOpen(false);
      }
    });

  const handleDelete = () =>
    startTransition(async () => {
      const result = await deleteEvent(eventId);
      if (result?.error) toast.error(result.error);
    });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" /> Setup
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit setup</DialogTitle>
            <DialogDescription>
              Distance, face and bow decide which scores this one is compared
              with.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Where</Label>
              <Select
                value={environment}
                onValueChange={(v) => setEnvironment(v as Setup['environment'])}
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
              <Label>Bow</Label>
              <Select value={bowStyle} onValueChange={setBowStyle}>
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
              <Label>Distance (m)</Label>
              <Input
                type="number"
                min={1}
                className="no-spinners"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Face (cm)</Label>
              <Select value={face} onValueChange={setFace}>
                <SelectTrigger>
                  <SelectValue placeholder="Face size" />
                </SelectTrigger>
                <SelectContent>
                  {['40', '60', '80', '122'].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f} cm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete scorecard</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scorecard?</AlertDialogTitle>
            <AlertDialogDescription>
              The score and its stored PDF will be permanently removed. You can
              re-import the PDF later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
