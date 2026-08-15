import { Download, FileJson, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ExportPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" /> Your Data
        </CardTitle>
        <CardDescription>
          Download a portable copy of every gymnast, meet, score, placement, and note.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild>
          <a href="/api/export?format=json">
            <FileJson className="mr-2 h-4 w-4" /> Complete JSON Archive
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/export?format=csv">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Spreadsheet CSV
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/dashboard?print=1">
            <Printer className="mr-2 h-4 w-4" /> Printable Summary
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
