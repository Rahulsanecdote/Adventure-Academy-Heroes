
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
  heroName: z.string().describe('The name of the hero of the story.'),
  level: z
    .number()
    .describe('The current level of the hero, indicating their experience.'),
});
export type StoryWeaverInput = z.infer<typeof StoryWeaverInputSchema>;

const StoryWeaverOutputSchema = z.object({
  story: z
    .string()
    .describe('A short, engaging adventure story for a child.'),
});
export type StoryWeaverOutput = z.infer<typeof StoryWeaverOutputSchema>;

export async function storyWeaver(
  input: StoryWeaverInput
): Promise<StoryWeaverOutput> {
  return storyWeaverFlow(input);
}

const prompt = ai.definePrompt({
  name: 'storyWeaverPrompt',
  input: {schema: StoryWeaverInputSchema},
  output: {schema: StoryWeaverOutputSchema},
  prompt: `You are a master storyteller for children, known as the Story Weaver.
Create a short (3-4 paragraphs), exciting, and age-appropriate adventure story.

The hero of the story is named {{{heroName}}}.
The hero is at level {{{level}}}, which should influence the challenge and complexity of the story. A higher level means a greater challenge.

The story should have a clear beginning, a challenge to overcome, and a satisfying resolution where the hero uses their wits or skills.
Keep the tone encouraging, positive, and full of wonder.

Example for a low-level hero:
Hero Name: Lily
Level: 2
Story: Lily, a brave Level 2 adventurer, found a map showing a secret garden behind the Whispering Waterfall. To get there, she had to solve a riddle from a friendly gnome. "I have keys, but open no locks. I have a space, but no room. You can enter, but can't go outside. What am I?" Lily thought hard and realized the answer was a keyboard! The gnome cheered and showed her the way to a beautiful garden filled with glowing flowers.

Example for a higher-level hero:
Hero Name: Sam
Level: 10
Story: Sam, a legendary Level 10 hero, heard whispers of a grumpy dragon in the Crystal Mountains who was hoarding all the sparkling river stones. Sam journeyed to the dragon's lair, not with a sword, but with a clever plan. The dragon was not evil, just lonely. Sam challenged the dragon to a game of wits, telling jokes and riddles. The dragon laughed so hard that sparkling tears rolled down its face, which turned into new river stones. They became friends, and the dragon promised to share the stones, ensuring the river flowed with sparkles once more.
`,
});

const storyWeaverFlow = ai.defineFlow(
  {
    name: 'storyWeaverFlow',
    inputSchema: StoryWeaverInputSchema,
    outputSchema: StoryWeaverOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
