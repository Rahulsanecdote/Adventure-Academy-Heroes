'use server';

/**
 * @fileOverview A flow for adjusting the difficulty of the game based on the user's performance.
 *
 * - adaptiveDifficultyAdjustment - A function that handles the difficulty adjustment process.
 * - AdaptiveDifficultyAdjustmentInput - The input type for the adaptiveDifficultyAdjustment function.
 * - AdaptiveDifficultyAdjustmentOutput - The return type for the adaptiveDifficultyAdjustment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptiveDifficultyAdjustmentInputSchema = z.object({
  childPerformance: z
    .number()
    .describe(
      'A numerical representation of the childs recent performance in the game. Higher values indicate better performance.'
    ),
  currentDifficulty: z
    .string()
    .describe(
      'The current difficulty setting of the game.  Must be one of: Very Easy, Easy, Medium, Hard, Very Hard.'
    ),
});
export type AdaptiveDifficultyAdjustmentInput = z.infer<
  typeof AdaptiveDifficultyAdjustmentInputSchema
>;

const AdaptiveDifficultyAdjustmentOutputSchema = z.object({
  newDifficulty: z
    .string()
    .describe(
      'The new difficulty setting of the game, adjusted based on the childs performance. Must be one of: Very Easy, Easy, Medium, Hard, Very Hard.'
    ),
  reasoning: z
    .string()
    .describe(
      'The reasoning behind the difficulty adjustment, explaining why the difficulty was increased, decreased, or kept the same.'
    ),
});
export type AdaptiveDifficultyAdjustmentOutput = z.infer<
  typeof AdaptiveDifficultyAdjustmentOutputSchema
>;

export async function adaptiveDifficultyAdjustment(
  input: AdaptiveDifficultyAdjustmentInput
): Promise<AdaptiveDifficultyAdjustmentOutput> {
  return adaptiveDifficultyAdjustmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adaptiveDifficultyAdjustmentPrompt',
  input: {schema: AdaptiveDifficultyAdjustmentInputSchema},
  output: {schema: AdaptiveDifficultyAdjustmentOutputSchema},
  prompt: `You are an expert game designer, skilled at creating adaptive game difficulty.

You will take the childs recent performance in the game, as well as the current difficulty, and output a new difficulty and reasoning.

Here are the possible difficulty settings:
- Very Easy
- Easy
- Medium
- Hard
- Very Hard

If the childs performance is very low, decrease the difficulty. If the childs performance is very high, increase the difficulty. Otherwise, keep the difficulty the same.

Childs Performance: {{{childPerformance}}}
Current Difficulty: {{{currentDifficulty}}}

Consider the following examples:

Childs Performance: 0.9
Current Difficulty: Easy
Output:
\`\`\`json
{
  "newDifficulty": "Medium",
  "reasoning": "The childs performance is very high, so the difficulty was increased from Easy to Medium."
}
\`\`\`

Childs Performance: 0.1
Current Difficulty: Medium
Output:
\`\`\`json
{
  "newDifficulty": "Easy",
  "reasoning": "The childs performance is very low, so the difficulty was decreased from Medium to Easy."
}
\`\`\`

Childs Performance: 0.5
Current Difficulty: Medium
Output:
\`\`\`json
{
  "newDifficulty": "Medium",
  "reasoning": "The childs performance is neither very high nor very low, so the difficulty was kept the same."
}
\`\`\`

Output:
\`\`\`json
{
  "newDifficulty": "`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const adaptiveDifficultyAdjustmentFlow = ai.defineFlow(
  {
    name: 'adaptiveDifficultyAdjustmentFlow',
    inputSchema: AdaptiveDifficultyAdjustmentInputSchema,
    outputSchema: AdaptiveDifficultyAdjustmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
