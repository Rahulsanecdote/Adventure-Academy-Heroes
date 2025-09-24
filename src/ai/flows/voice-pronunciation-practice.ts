
'use server';
/**
 * @fileOverview A voice pronunciation practice AI agent.
 *
 * - voicePronunciationPractice - A function that handles the voice pronunciation practice process.
 * - VoicePronunciationPracticeInput - The input type for the voicePronunciationPractice function.
 * - VoicePronunciationPracticeOutput - The return type for the voicePronunciationPractice function.
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import {z} from 'genkit';
import wav from 'wav';

const VoicePronunciationPracticeInputSchema = z.object({
  command: z.string().describe('The command to pronounce.'),
});
export type VoicePronunciationPracticeInput = z.infer<typeof VoicePronunciationPracticeInputSchema>;

const VoicePronunciationPracticeOutputSchema = z.object({
  audio: z.string().describe('The audio of the pronounced command in WAV format as a data URI.'),
});
export type VoicePronunciationPracticeOutput = z.infer<typeof VoicePronunciationPracticeOutputSchema>;

export async function voicePronunciationPractice(input: VoicePronunciationPracticeInput): Promise<VoicePronunciationPracticeOutput> {
  return voicePronunciationPracticeFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const voicePronunciationPracticeFlow = ai.defineFlow(
  {
    name: 'voicePronunciationPracticeFlow',
    inputSchema: VoicePronunciationPracticeInputSchema,
    outputSchema: VoicePronunciationPracticeOutputSchema,
  },
  async input => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
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
        ]
      },
      prompt: input.command,
    });

    if (!media) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      audio: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);
