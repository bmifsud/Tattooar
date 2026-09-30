// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { ClientOnly } from '../../components/ClientOnly';
import { Loader2 } from 'lucide-react';
import React, { Suspense, useEffect, useState } from 'react';
import { type TattooStyle, saveImage, saveStyle } from '../../utils/storage';

const TattooRenderer = React.lazy(() => import('../../components/TattooRenderer'));

export const Route = createFileRoute('/embed/try-on')({
  component: EmbedTryOnPage,
});

function EmbedTryOnPage() {
  const [receivedStyle, setReceivedStyle] = useState<TattooStyle | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const styleData = searchParams.get('style');
    if (styleData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(styleData));
        setReceivedStyle(parsed);
      } catch (e) {
        console.error("Failed to parse style from URL", e);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LOAD_TATTOO_STYLE' && event.data?.payload) {
        const payload = event.data.payload;
        if (payload.dataUrl) {
            const id = `embed_${Date.now()}`;
            saveImage(id, payload.dataUrl);
            payload.style.previewUrl = id;
        }

        setReceivedStyle(payload.style);
        if (payload.style) {
            saveStyle(payload.style);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <ClientOnly fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
         <TattooRenderer initialStyle={receivedStyle} isEmbed={true} />
      </Suspense>
    </ClientOnly>
  );
}
