
"use client";

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { BookMarked, Loader, Wand2 } from "lucide-react";
import { getStory } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

const initialState = {
  message: "",
  story: null,
  image: null,
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
          Weave a Story
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
  const [state, formAction] = useActionState(getStory, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && state.message !== "Success") {
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: state.message || (state.errors as any)?.heroName?.[0] || (state.errors as any)?.level?.[0] || "An unknown error occurred.",
      });
    }
  }, [state, toast]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <BookMarked className="text-accent" />
          Story Weaver AI
        </CardTitle>
        <CardDescription>Create a unique adventure story for your hero.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroName">Hero&apos;s Name</Label>
            <Input
              id="heroName"
              name="heroName"
              defaultValue={heroName}
              required
              className="bg-background"
            />
             {state.errors?.heroName && <p className="text-sm font-medium text-destructive">{state.errors.heroName[0]}</p>}
          </div>
          <input type="hidden" name="level" value={level} />
          <SubmitButton />
        </form>
        {state.story && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
             <h4 className="font-semibold text-center">A Hero's Tale</h4>
             {state.image && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <Image src={state.image} alt="Story illustration" fill className="object-cover" />
                </div>
             )}
             <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{state.story}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
