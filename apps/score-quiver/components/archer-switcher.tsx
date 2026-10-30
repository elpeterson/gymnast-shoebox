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
import { setActiveArcher, createArcher } from '@/app/actions/archer';
import { toast } from 'sonner';

type Archer = {
  id: string;
  name: string;
};

export function ArcherSwitcher({
  archers,
  activeArcherId,
}: {
  archers: Archer[];
  activeArcherId: string | undefined;
}) {
  const [open, setOpen] = React.useState(false);
  const [showNewArcherDialog, setShowNewArcherDialog] = React.useState(
    archers.length === 0,
  );

  const selectedArcher =
    archers.find((a) => a.id === activeArcherId) || archers[0];

  const handleArcherSelect = async (archer: Archer) => {
    setOpen(false);
    await setActiveArcher(archer.id);
    toast.success(`Switched to ${archer.name}`);
  };

  const handleCreateArcher = async (formData: FormData) => {
    const result = await createArcher(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Archer profile created');
      setShowNewArcherDialog(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={showNewArcherDialog} onOpenChange={setShowNewArcherDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            <User className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">
              {selectedArcher?.name || 'Add an archer'}
            </span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search archer..." />
              <CommandEmpty>No archer found.</CommandEmpty>
              <CommandGroup heading="Archers">
                {archers.map((archer) => (
                  <CommandItem
                    key={archer.id}
                    onSelect={() => handleArcherSelect(archer)}
                    className="text-sm"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {archer.name}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        selectedArcher?.id === archer.id
                          ? 'opacity-100'
                          : 'opacity-0',
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
                      setShowNewArcherDialog(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Add Archer
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Archer Profile</DialogTitle>
          <DialogDescription>
            Create a profile to keep an archer&apos;s scorecards together.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreateArcher}>
          <div className="space-y-2 py-2 pb-4">
            <Label htmlFor="name">Archer Name</Label>
            <Input id="name" name="name" placeholder="e.g. Robin" required />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewArcherDialog(false)}
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
