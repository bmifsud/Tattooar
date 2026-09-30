import { createFileRoute } from '@tanstack/react-router';
import { ClientOnly } from '../components/ClientOnly';
import { Loader2 } from 'lucide-react';
import React, { Suspense } from 'react';

const TattooRenderer = React.lazy(() => import('../components/TattooRenderer'));

export const Route = createFileRoute('/try-on')({
  component: TryOnPage,
});

function TryOnPage() {
  return (
    <ClientOnly fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
         <TattooRenderer isEmbed={false} />
      </Suspense>
    </ClientOnly>
  );
}
