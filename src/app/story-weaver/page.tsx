
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import StoryDisplay from '@/components/story-weaver/story-display';
import StoryControls from '@/components/story-weaver/story-controls';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, BookMarked, ArrowLeft } from 'lucide-react';

export default function StoryWeaverPage() {
  const [storyHistory, setStoryHistory] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // A welcome toast when the page loads
    toast({
      title: 'Welcome to the Skit Weaver!',
      description: 'Let\'s create a story together. Start by adding a character and a line of dialogue.',
    });
  }, [toast]);

  const handleNewStoryLine = (line: string) => {
    setStoryHistory(prev => [...prev, line]);
  };

  const handleResetStory = () => {
    setStoryHistory([]);
    toast({
      title: 'Story Reset!',
      description: 'You have a fresh canvas to start a new skit.',
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <BookMarked className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold font-headline">Skit Weaver</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleResetStory} disabled={storyHistory.length === 0}>
            Reset Story
          </Button>
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Dashboard</span>
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-28">
        <StoryDisplay storyHistory={storyHistory} />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
        <div className="container mx-auto max-w-2xl">
          <StoryControls onNewLine={handleNewStoryLine} storyHistory={storyHistory} />
        </div>
      </footer>
    </div>
  );
}
