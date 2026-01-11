import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee } from 'lucide-react';
import Link from 'next/link';

export default async function AboutPage() {
  const filePath = path.join(process.cwd(), 'README.md');
  let content = '';

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    content = '# Error\nCould not load README file.';
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-primary">
          Why I built this
        </h2>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              A note from Eric
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base leading-7 text-muted-foreground">
            <p>
              My son started competing in gymnastics two seasons ago. Like many
              parents, I quickly realized that tracking his progress was a
              nightmare. The official apps were unreliable, meets used different
              scoring websites, and half the time we ended up with just a paper
              printout. There was no single place to keep his history—so I built
              one.
            </p>
            <p>
              At the end of the day all of this here is <strong>your</strong>{' '}
              data and it belongs to you. The README (below) has all the
              instructions you need to host your own database, and version of
              Gymnast Shoebox, by yourself so you never have to worry about{' '}
              <em>my</em> app going the way of MyUSAGym. All the code is free
              and available for you to use however you please.
            </p>
            <p>
              <strong>Gymnast Shoebox</strong> is designed to be the digital
              home for your gymnast's scores. I hope it helps you enjoy the
              meets a little more without worrying about losing the data.
            </p>

            <div className="pt-4">
              <Button
                asChild
                className="bg-[#FF5E5B] hover:bg-[#FF5E5B]/90 text-white font-bold rounded-full"
              >
                <Link
                  href="https://ko-fi.com/elpeterson"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  Buy me a coffee
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                If you find this app useful, a coffee helps keep the servers
                running!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-primary">
          Project Details
        </h2>
        <Card>
          <CardContent className="pt-6">
            <article className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-primary prose-a:text-blue-600">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
