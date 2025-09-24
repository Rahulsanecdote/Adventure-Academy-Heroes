"use client";

import { useEffect, useRef, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mic, Loader, Play, Volume2 } from "lucide-react";
import { getPronunciation } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const initialState = {
  message: "",
  audio: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
      {pending ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Volume2 className="mr-2 h-4 w-4" />
          Pronounce It!
        </>
      )}
    </Button>
  );
}

export default function VoiceActivity() {
  const [state, formAction] = useActionState(getPronunciation, initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && state.message !== "Success") {
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: state.message,
      });
    }
    if (state.audio) {
      if (audioRef.current) {
        audioRef.current.src = state.audio;
        audioRef.current.play();
      }
    }
  }, [state, toast]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Mic className="text-accent" />
          Pronunciation Practice
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="command">Word or phrase to practice</Label>
            <Input
              id="command"
              name="command"
              placeholder="e.g., 'Obstacle'"
              required
              className="bg-background"
            />
          </div>
          <SubmitButton />
        </form>
        {state.audio && <audio ref={audioRef} className="hidden" />}
      </CardContent>
    </Card>
  );
}
