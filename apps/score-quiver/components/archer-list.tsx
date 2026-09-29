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
import { updateArcher, deleteArcher } from '@/app/actions/archer';
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

type Archer = {
  id: string;
  name: string;
};

export function ArcherList({ archers }: { archers: Archer[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Profiles</CardTitle>
        <CardDescription>Rename or remove archer profiles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {archers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No archers yet. Add one from the switcher in the header.
          </p>
        )}
        {archers.map((archer) => (
          <ArcherRow key={archer.id} archer={archer} />
        ))}
      </CardContent>
    </Card>
  );
}

function ArcherRow({ archer }: { archer: Archer }) {
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleUpdate = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateArcher(archer.id, formData);
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
      const result = await deleteArcher(archer.id);
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
        <span className="font-medium">{archer.name}</span>
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
              <span className="sr-only">Edit {archer.name}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Archer Profile</DialogTitle>
              <DialogDescription>Update the profile name.</DialogDescription>
            </DialogHeader>
            <form action={handleUpdate}>
              <div className="py-4 space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={archer.name}
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
              <span className="sr-only">Delete {archer.name}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {archer.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this profile,{' '}
                <strong>all their scorecards</strong>, and the stored PDFs. This
                cannot be undone.
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
