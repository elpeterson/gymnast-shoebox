import { cn } from '@/lib/utils';

// Colors follow the target face: gold 9-10, red 7-8, blue 5-6, black 3-4,
// white 1-2, grey for a miss.
export const ARROW_CLASSES: Record<string, string> = {
  X: 'bg-face-gold text-black',
  '10': 'bg-face-gold text-black',
  '9': 'bg-face-gold text-black',
  '8': 'bg-face-red text-white',
  '7': 'bg-face-red text-white',
  '6': 'bg-face-blue text-white',
  '5': 'bg-face-blue text-white',
  '4': 'bg-face-black text-white',
  '3': 'bg-face-black text-white',
  '2': 'bg-face-white text-black border border-border',
  '1': 'bg-face-white text-black border border-border',
  M: 'bg-face-miss text-foreground/70',
};

export const ARROW_FILL: Record<string, string> = {
  X: 'hsl(var(--face-gold))',
  '10': 'hsl(var(--face-gold))',
  '9': 'hsl(var(--face-gold))',
  '8': 'hsl(var(--face-red))',
  '7': 'hsl(var(--face-red))',
  '6': 'hsl(var(--face-blue))',
  '5': 'hsl(var(--face-blue))',
  '4': 'hsl(var(--face-black))',
  '3': 'hsl(var(--face-black))',
  '2': 'hsl(var(--face-white))',
  '1': 'hsl(var(--face-white))',
  M: 'hsl(var(--face-miss))',
};

export function ArrowChip({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
        ARROW_CLASSES[value] ?? 'bg-muted',
        className,
      )}
    >
      {value}
    </span>
  );
}
