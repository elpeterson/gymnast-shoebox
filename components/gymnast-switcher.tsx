'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, PlusCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setActiveGymnast, createGymnast } from '@/app/actions/gymnast';
import { toast } from 'sonner';

type Gymnast = {
  id: string;
  name: string;
};

export function GymnastSwitcher({
  gymnasts,
  activeGymnastId,
}: {
  gymnasts: Gymnast[];
  activeGymnastId: string | undefined;
}) {
  const [open, setOpen] = React.useState(false);
  const [showNewGymnastDialog, setShowNewGymnastDialog] = React.useState(false);

  const selectedGymnast =
    gymnasts.find((g) => g.id === activeGymnastId) || gymnasts[0];

  const handleGymnastSelect = async (gymnast: Gymnast) => {
    setOpen(false);
    await setActiveGymnast(gymnast.id);
    toast.success(`Switched to ${gymnast.name}`);
  };

  const handleCreateGymnast = async (formData: FormData) => {
    const result = await createGymnast(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Gymnast profile created');
      setShowNewGymnastDialog(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={showNewGymnastDialog} onOpenChange={setShowNewGymnastDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            <User className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            {selectedGymnast?.name || 'Select Gymnast'}
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search gymnast..." />
              <CommandEmpty>No gymnast found.</CommandEmpty>
              <CommandGroup heading="Gymnasts">
                {gymnasts.map((gymnast) => (
                  <CommandItem
                    key={gymnast.id}
                    onSelect={() => handleGymnastSelect(gymnast)}
                    className="text-sm"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {gymnast.name}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        selectedGymnast?.id === gymnast.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowNewGymnastDialog(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Add Gymnast
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Dialog Content */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Gymnast Profile</DialogTitle>
          <DialogDescription>
            Create a new profile to track scores for another gymnast.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreateGymnast}>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Gymnast Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Michael"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewGymnastDialog(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit">Create Profile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
