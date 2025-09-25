
"use client";

import { useEffect, useActionState, useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { BookMarked, Loader, Wand2 } from "lucide-react";
import { getStory } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";

const initialState = {
  message: "",
  storyContinuation: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Weaving...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Continue Skit
        </>
      )}
    </Button>
  );
}

type StoryWeaverProps = {
  heroName: string;
  level: number;
};

export default function StoryWeaver({ heroName, level }: StoryWeaverProps) {
  const [storyHistory, setStoryHistory] = useState<string[]>([]);
  const [characterName, setCharacterName] = useState(heroName);
  const [state, formAction] = useActionState(getStory, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message && state.message !== "Success") {
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: state.message || (state.errors as any)?.characterName?.[0] || "An unknown error occurred.",
      });
    }

    if (state.message === "Success" && state.storyContinuation) {
      setStoryHistory(prev => [...prev, state.storyContinuation!]);
      // Reset the form / state after successful submission
      if(formRef.current) formRef.current.reset();
      setCharacterName("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, toast]);

  const handleResetStory = () => {
    setStoryHistory([]);
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 font-headline">
              <BookMarked className="text-accent" />
              Skit Weaver AI
            </CardTitle>
            {storyHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleResetStory}>Reset</Button>
            )}
        </div>
        <CardDescription>Create a unique adventure skit, one line at a time.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="characterName">Character Name</Label>
            <Input
              id="characterName"
              name="characterName"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="e.g., Alex the Brave"
              required
              className="bg-background"
            />
             {state.errors?.characterName && <p className="text-sm font-medium text-destructive">{state.errors.characterName[0]}</p>}
          </div>
          <input type="hidden" name="storyHistory" value={storyHistory.join('\n')} />
          <SubmitButton />
        </form>
        
        {storyHistory.length > 0 && (
          <div className="mt-6 space-y-3">
             <h4 className="font-semibold text-center">Your Adventure Skit</h4>
             <ScrollArea className="h-48 w-full rounded-md border p-4 bg-muted/50">
              <div className="space-y-4">
                {storyHistory.map((line, index) => (
                  <p key={index} className="text-sm text-foreground leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
             </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
