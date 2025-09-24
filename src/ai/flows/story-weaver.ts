
'use server';
/**
 * @fileOverview A story weaving AI agent that creates personalized adventure stories with images.
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
  image: z
    .string()
    .describe('A data URI of a generated image that illustrates the story.'),
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
  output: {schema: z.object({
    story: z
      .string()
      .describe('A short, engaging adventure story for a child (3-4 paragraphs).'),
    imagePrompt: z
      .string()
      .describe('A detailed prompt for an image generation model to illustrate the story. The style should be a vibrant and whimsical children\'s book illustration.'),
  })},
  prompt: `You are a master storyteller for children, known as the Story Weaver.
Create a short (3-4 paragraphs), exciting, and age-appropriate adventure story.
Also, create a detailed prompt for an image generation model to create an illustration for the story.

The hero of the story is named {{{heroName}}}.
The hero is at level {{{level}}}, which should influence the challenge and complexity of the story. A higher level means a greater challenge.

The story should have a clear beginning, a challenge to overcome, and a satisfying resolution where the hero uses their wits or skills.
The image prompt should describe the key scene of the story in a style that is vibrant, whimsical, and looks like a children's book illustration.
Keep the tone encouraging, positive, and full of wonder.

Example for a low-level hero:
Hero Name: Lily
Level: 2
Output:
{
  "story": "Lily, a brave Level 2 adventurer, found a map showing a secret garden behind the Whispering Waterfall. To get there, she had to solve a riddle from a friendly gnome. \"I have keys, but open no locks. I have a space, but no room. You can enter, but can't go outside. What am I?\" Lily thought hard and realized the answer was a keyboard! The gnome cheered and showed her the way to a beautiful garden filled with glowing flowers.",
  "imagePrompt": "A vibrant and whimsical children's book illustration of a young girl named Lily with a friendly gnome in a magical garden. The garden is filled with oversized, glowing flowers of various colors. A waterfall can be seen in the background. The style is soft and dreamlike."
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
      throw new Error('Failed to generate story.');
    }

    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: output.imagePrompt,
    });
    
    const imageUrl = media?.url;
    if (!imageUrl) {
        throw new Error('Failed to generate image.');
    }

    return {
      story: output.story,
      image: imageUrl,
    };
  }
);
