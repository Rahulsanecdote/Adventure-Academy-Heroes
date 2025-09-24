"use server";

import {
  adaptiveDifficultyAdjustment,
  AdaptiveDifficultyAdjustmentInput,
} from "@/ai/flows/adaptive-difficulty-adjustment";
import {
  voicePronunciationPractice,
  VoicePronunciationPracticeInput,
} from "@/ai/flows/voice-pronunciation-practice";
import { z } from "zod";
import { difficultyLevels } from "@/lib/types";

export async function getPronunciation(prevState: any, formData: FormData) {
  const schema = z.object({
    command: z.string().min(1, "Please enter some text"),
  });
  const validatedFields = schema.safeParse({
    command: formData.get("command"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await voicePronunciationPractice({ command: validatedFields.data.command });
    return {
      message: "Success",
      audio: result.audio,
    };
  } catch (error) {
    return {
      message: "An error occurred while generating audio.",
    };
  }
}

export async function getNewDifficulty(prevState: any, formData: FormData) {
  const schema = z.object({
    performance: z.coerce.number(),
    difficulty: z.enum(difficultyLevels),
  });

  const validatedFields = schema.safeParse({
    performance: formData.get("performance"),
    difficulty: formData.get("difficulty"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await adaptiveDifficultyAdjustment({
      childPerformance: validatedFields.data.performance,
      currentDifficulty: validatedFields.data.difficulty,
    });
    return {
      message: "Success",
      ...result,
    };
  } catch (error) {
    console.error(error);
    return {
      message: "An error occurred while adjusting difficulty.",
    };
  }
}
