import { redirect } from 'next/navigation';
import { archerIdFromParam } from '@/lib/betweenends/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ArcherLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const archerId = id ? archerIdFromParam(id) : null;
  if (archerId) redirect(`/archer/${archerId}`);

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Find an archer</CardTitle>
        <CardDescription>
          Enter a USA Archery membership number to see every Between Ends result recorded under it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/archer" method="get" className="flex gap-2">
          <Input
            name="id"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Membership number"
            defaultValue={id ?? ''}
            aria-label="USA Archery membership number"
            required
          />
          <Button type="submit">View</Button>
        </form>
        {id && !archerId && (
          <p className="mt-3 text-sm text-red-500">That doesn&apos;t look like a membership number.</p>
        )}
      </CardContent>
    </Card>
  );
}
