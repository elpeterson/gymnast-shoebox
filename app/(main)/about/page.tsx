import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';

export default async function AboutPage() {
  const filePath = path.join(process.cwd(), 'README.md');
  let content = '';

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    content = '# Error\nCould not load README file.';
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        About Gymnast Shoebox
      </h1>

      <Card>
        <CardContent className="pt-6">
          <article className="prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
