'use client';

import { useState, useTransition } from 'react';
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
import { Pencil, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { updateGymnast, deleteGymnast } from '@/app/actions/gymnast';
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

type Gymnast = {
  id: string;
  name: string;
};

export function GymnastList({ gymnasts }: { gymnasts: Gymnast[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Profiles</CardTitle>
        <CardDescription>
          Add, rename, or remove gymnast profiles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {gymnasts.map((gymnast) => (
          <GymnastRow key={gymnast.id} gymnast={gymnast} />
        ))}
      </CardContent>
    </Card>
  );
}

function GymnastRow({ gymnast }: { gymnast: Gymnast }) {
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleUpdate = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateGymnast(gymnast.id, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Profile updated');
        setIsEditOpen(false);
      }
    });
  };

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteGymnast(gymnast.id);
      if (result?.error) {
        toast.error('Cannot delete', { description: result.error });
      } else {
        toast.success('Profile deleted');
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <User className="h-4 w-4" />
        </div>
        <span className="font-medium">{gymnast.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Gymnast</DialogTitle>
              <DialogDescription>
                Change the display name for this profile.
              </DialogDescription>
            </DialogHeader>
            <form action={handleUpdate}>
              <div className="py-4">
                <Label htmlFor="name" className="mb-2 block">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={gymnast.name}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {gymnast.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this profile and{' '}
                <strong>ALL their scores</strong>. This action cannot be undone.
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
      </div>
    </div>
  );
}
