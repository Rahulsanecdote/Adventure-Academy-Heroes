
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";

type StoryDisplayProps = {
  storyHistory: string[];
};

export default function StoryDisplay({ storyHistory }: StoryDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [storyHistory]);

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
        <div className="space-y-6">
          {storyHistory.length === 0 ? (
            <div className="text-center text-muted-foreground pt-16">
                <Bot className="mx-auto h-12 w-12 mb-4"/>
                <h3 className="text-lg font-semibold">The stage is empty.</h3>
                <p>Use the controls below to start your skit!</p>
            </div>
          ) : (
            storyHistory.map((line, index) => (
              <p key={index} className="text-base leading-relaxed animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                {line}
              </p>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
