
'use server';
/**
 * @fileOverview A story weaving AI agent that creates personalized adventure stories.
 *
 * - storyWeaver - A function that handles the story generation process.
 * - StoryWeaverInput - The input type for the storyWeaver function.
 * - StoryWeaverOutput - The return type for the storyWeaver function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StoryWeaverInputSchema = z.object({
  characterName: z.string().describe('The name of the character speaking or acting.'),
  storyHistory: z.string().describe('The story so far, as a single string.'),
});
export type StoryWeaverInput = z.infer<typeof StoryWeaverInputSchema>;

const StoryWeaverOutputSchema = z.object({
  storyContinuation: z
    .string()
    .describe('The next part of the skit, as a single line of dialogue or action.'),
});
export type StoryWeaverOutput = z.infer<typeof StoryWeaverOutputSchema>;

export async function storyWeaver(
  input: StoryWeaverInput
): Promise<StoryWeaverOutput> {
  return storyWeaverFlow(input);
}

const storyPrompt = ai.definePrompt({
  name: 'storyWeaverStoryPrompt',
  input: {schema: StoryWeaverInputSchema},
  output: {schema: StoryWeaverOutputSchema},
  prompt: `You are a "Skit Master," an expert at creating fun, simple, and continuous skits for children.
Your task is to continue a story, one line at a time.
You will be given the story so far and the name of the character who is currently speaking or acting.
Generate a single, short, and exciting line of dialogue or a simple action for that character.
If the story history is empty, start a new, exciting adventure!

The current character is: {{{characterName}}}

Here is the story so far:
---
{{{storyHistory}}}
---

Example 1 (Starting a story):
Character Name: Captain Mia
Story History: (empty)
Output:
{
  "storyContinuation": "Captain Mia stood at the helm of her spaceship, gazing at the shimmering Purple Planet. \"Looks like we're here!\" she announced."
}

Example 2 (Continuing a story):
Character Name: Sparky the Robot
Story History: Captain Mia stood at the helm of her spaceship, gazing at the shimmering Purple Planet. "Looks like we're here!" she announced.
Output:
{
  "storyContinuation": "Sparky the Robot beeped excitedly, his metallic arms waving. \"Warning! Asteroid field approaching!\""
}
`,
});

const storyWeaverFlow = ai.defineFlow(
  {
    name: 'storyWeaverFlow',
    inputSchema: StoryWeaverInputSchema,
    outputSchema: StoryWeaverOutputSchema,
  },
  async input => {
    const { output } = await storyPrompt(input);
    if (!output) {
      throw new Error('Failed to generate story continuation.');
    }
    return output;
  }
);
