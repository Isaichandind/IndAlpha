import { useState, useEffect } from 'react';
import { Loader2, Quote as QuoteIcon } from 'lucide-react';
import { getRandomQuote, Quote } from '../utils/quotes';

interface SmartLoaderProps {
  message?: string;
  rotateIntervalMs?: number;
  className?: string;
}

export function SmartLoader({ 
  message = "Loading...", 
  rotateIntervalMs = 4000,
  className = ""
}: SmartLoaderProps) {
  const [quote, setQuote] = useState<Quote>(getRandomQuote());
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // If we want it to rotate
    if (rotateIntervalMs > 0) {
      const interval = setInterval(() => {
        setFade(false); // trigger fade out
        setTimeout(() => {
          setQuote(getRandomQuote());
          setFade(true); // trigger fade in
        }, 500); // 500ms for transition
      }, rotateIntervalMs);
      
      return () => clearInterval(interval);
    }
  }, [rotateIntervalMs]);

  return (
    <div className={`flex flex-col items-center justify-center space-y-6 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indalpha-green" />
        <span className="text-sm font-bold text-indalpha-muted tracking-widest uppercase">{message}</span>
      </div>

      <div className={`max-w-md px-6 py-4 bg-indalpha-card/40 border border-indalpha-border/50 rounded-xl relative transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <QuoteIcon className="absolute top-3 left-3 w-5 h-5 text-indalpha-muted/20" />
        <div className="text-center italic text-indalpha-text/90 font-medium mb-3 relative z-10 px-4">
          "{quote.text}"
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="h-px bg-indalpha-border flex-1 max-w-[20px]" />
          <span className="text-xs font-bold text-indalpha-muted uppercase tracking-wider">{quote.author}</span>
          <div className="h-px bg-indalpha-border flex-1 max-w-[20px]" />
        </div>
        <div className="text-[10px] text-center mt-1 text-indalpha-muted/50 font-bold uppercase tracking-widest">
          {quote.category}
        </div>
      </div>
    </div>
  );
}
