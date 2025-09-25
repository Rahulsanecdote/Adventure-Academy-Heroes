
'use client';

import { useEffect, useActionState, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Wand2, Loader } from 'lucide-react';
import { getStory } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const initialState = {
  message: '',
  storyContinuation: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
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

type StoryControlsProps = {
  onNewLine: (line: string) => void;
  storyHistory: string[];
};

export default function StoryControls({ onNewLine, storyHistory }: StoryControlsProps) {
  const [characterName, setCharacterName] = useState('');
  const [state, formAction] = useActionState(getStory, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    if (state.message && state.message !== 'Success') {
      toast({
        variant: 'destructive',
        title: 'Oh no! Something went wrong.',
        description: state.message || (state.errors as any)?.characterName?.[0] || 'An unknown error occurred.',
      });
    }

    if (state.message === 'Success' && state.storyContinuation) {
      onNewLine(state.storyContinuation);
      setCharacterName('');
      // The form does not reset automatically with useActionState, so we manually reset it.
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, toast]);


  return (
    <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row items-center gap-2">
      <Input
        id="characterName"
        name="characterName"
        value={characterName}
        onChange={(e) => setCharacterName(e.target.value)}
        placeholder="Enter Character Name..."
        required
        className="flex-grow bg-background"
        autoComplete="off"
      />
      <input type="hidden" name="storyHistory" value={storyHistory.join('\n')} />
      <SubmitButton />
    </form>
  );
}
