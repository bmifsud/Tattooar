// @ts-nocheck
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { openai } from '@ai-sdk/openai';

export const APIRoute = createAPIFileRoute('/api/generate-art')({
  POST: async ({ request }: { request: Request }) => {
    try {
      const body = await request.json();
      const { style } = body;

      const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      return new Response(JSON.stringify({ imageUrl: mockDataUrl }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error("Art generation error:", error);
      return new Response(JSON.stringify({ error: 'Failed to generate image' }), { status: 500 });
    }
  },
});
