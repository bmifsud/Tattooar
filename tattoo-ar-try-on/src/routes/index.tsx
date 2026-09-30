// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { getChatHistory, saveChatHistory, getSavedStyles, saveStyle, type TattooStyle, saveImage } from '../utils/storage';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Image as ImageIcon, Download, Camera, Loader2, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
  });

  const [savedStyles, setSavedStyles] = useState<TattooStyle[]>([]);
  const [currentStyle, setCurrentStyle] = useState<Partial<TattooStyle> | null>(null);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [generatedArtUrl, setGeneratedArtUrl] = useState<string | null>(null);

  useEffect(() => {
    setMessages(getChatHistory());
    setSavedStyles(getSavedStyles());
  }, [setMessages]);

  useEffect(() => {
    saveChatHistory(messages);
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.toolInvocations) {
      for (const invocation of latestMessage.toolInvocations) {
        if (invocation.toolName === 'generate_tattoo_style' && 'result' in invocation) {
          setCurrentStyle(invocation.result as Partial<TattooStyle>);
        } else if (invocation.toolName === 'generate_tattoo_style' && 'args' in invocation) {
          setCurrentStyle(invocation.args as Partial<TattooStyle>);
        }
      }
    }
  }, [messages]);

  const handleGenerateArt = async () => {
    if (!currentStyle) return;
    setIsGeneratingArt(true);
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: currentStyle }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        const id = `art_${Date.now()}`;
        saveImage(id, data.imageUrl);
        setGeneratedArtUrl(data.imageUrl);

        const newStyle: TattooStyle = {
          id,
          inkPalette: currentStyle.inkPalette || ['black'],
          technique: currentStyle.technique || 'Linework',
          lineWeight: currentStyle.lineWeight || 'bold',
          scale: currentStyle.scale || 1.0,
          previewUrl: id,
          createdAt: Date.now(),
        };
        saveStyle(newStyle);
        setSavedStyles(getSavedStyles());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingArt(false);
    }
  };

  const exportStyle = (style: TattooStyle) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(style, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `tattoo-style-${style.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex flex-col h-screen md:flex-row bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <div className="flex-1 flex flex-col h-[50vh] md:h-screen border-r border-neutral-200 dark:border-neutral-800">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-black">
          <h1 className="font-bold text-xl flex items-center gap-2"><Sparkles className="w-5 h-5"/> Studio Chat</h1>
          <Link to="/try-on" className="text-sm bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full font-medium flex items-center gap-2">
            <Camera className="w-4 h-4"/> Try AR
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
             <div className="text-center text-neutral-500 mt-10">
               Describe your dream tattoo to get started...
             </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-bl-none'
              }`}>
                {m.content}
                {m.toolInvocations?.map(tool => (
                  <div key={tool.toolCallId} className="mt-2 text-xs opacity-80 border-t border-current pt-2">
                    {tool.toolName === 'generate_tattoo_style' && 'Generating tattoo style specifications...'}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
               <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-2">
                 <Loader2 className="w-4 h-4 animate-spin"/> Thinking...
               </div>
             </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
          <input
            className="flex-1 border border-neutral-300 dark:border-neutral-700 rounded-full px-4 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            placeholder="E.g., A minimalist geometric wolf..."
            onChange={handleInputChange}
          />
          <button type="submit" disabled={isLoading || !input} className="bg-blue-600 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center disabled:opacity-50">
            <ArrowRight className="w-5 h-5"/>
          </button>
        </form>
      </div>

      <div className="flex-1 flex flex-col h-[50vh] md:h-screen bg-neutral-100 dark:bg-neutral-950 overflow-y-auto">
        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[300px]">
          {currentStyle ? (
            <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="font-bold text-lg mb-2">Live Preview Data</h3>
                <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                  <p><span className="font-medium text-black dark:text-white">Style:</span> {currentStyle.technique}</p>
                  <p><span className="font-medium text-black dark:text-white">Colors:</span> {currentStyle.inkPalette?.join(', ')}</p>
                  <p><span className="font-medium text-black dark:text-white">Lines:</span> {currentStyle.lineWeight}</p>
                  <p><span className="font-medium text-black dark:text-white">Scale:</span> {currentStyle.scale}x</p>
                </div>
              </div>

              <div className="aspect-square bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center relative">
                {generatedArtUrl ? (
                  <img src={generatedArtUrl} alt="Generated Tattoo" className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-lighten" />
                ) : (
                  <ImageIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-700" />
                )}
              </div>

              <div className="p-4">
                <button
                  onClick={handleGenerateArt}
                  disabled={isGeneratingArt}
                  className="w-full bg-black dark:bg-white text-white dark:text-black rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingArt ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                  {isGeneratingArt ? 'Generating...' : 'Generate Art'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-neutral-400 flex flex-col items-center gap-4">
              <ImageIcon className="w-16 h-16 opacity-50"/>
              <p>Chat with the AI to start building your tattoo profile.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <h4 className="font-medium text-sm mb-3 text-neutral-500">Saved Styles</h4>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {savedStyles.map((style) => (
              <div key={style.id} className="snap-start flex-shrink-0 w-32 bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 relative group">
                <div className="aspect-square bg-neutral-200 dark:bg-neutral-800">
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 p-2 text-center">
                      {style.technique}
                    </div>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button onClick={() => exportStyle(style)} className="text-white hover:text-blue-400 p-1 bg-black/50 rounded-full" title="Export JSON">
                        <Download className="w-4 h-4"/>
                    </button>
                </div>
              </div>
            ))}
            {savedStyles.length === 0 && (
              <div className="text-sm text-neutral-400">No saved styles yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
