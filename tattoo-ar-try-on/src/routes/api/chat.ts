// @ts-nocheck
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const APIRoute = createAPIFileRoute('/api/chat')({
  POST: async ({ request }: { request: Request }) => {
    const { messages } = await request.json();

    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      system: `You are an expert tattoo artist assisting a user in designing a custom tattoo.
      Discuss their ideas, ask clarifying questions, and when they seem to have a concrete idea,
      generate the tattoo style using the 'generate_tattoo_style' tool.
      Be concise, creative, and enthusiastic.`,
      tools: {
        generate_tattoo_style: tool({
          description: 'Generates a structured tattoo style specification based on the conversation.',
          parameters: z.object({
            inkPalette: z.array(z.string()).describe('List of colors/inks to use (e.g. ["black", "grey wash"], or ["red", "blue"])'),
            technique: z.string().describe('The tattoo technique or style (e.g., Traditional, Realism, Linework, Watercolor)'),
            lineWeight: z.string().describe('Description of the line weight (e.g., bold, fine, dynamic)'),
            scale: z.number().min(0.1).max(3.0).describe('Suggested scale relative to body part, 1.0 is normal.'),
          }),
          execute: async (styleParams: any) => {
            return styleParams;
          }
        }),
      },
    });

    return result.toDataStreamResponse();
  },
});
