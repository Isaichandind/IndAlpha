import { useEffect, useRef, memo } from 'react';

interface StockChartProps {
  candles?: any[];
  loading?: boolean;
  symbol: string;
}

function getTVSymbol(yahooSymbol: string) {
  if (!yahooSymbol) return "BSE:SENSEX";
  if (yahooSymbol.endsWith('.NS')) return `NSE:${yahooSymbol.replace('.NS', '')}`;
  if (yahooSymbol.endsWith('.BO')) return `BSE:${yahooSymbol.replace('.BO', '')}`;
  
  // Handle indices
  if (yahooSymbol === '^NSEI') return 'NSE:NIFTY';
  if (yahooSymbol === '^BSESN') return 'BSE:SENSEX';
  if (yahooSymbol === '^NSEBANK') return 'NSE:BANKNIFTY';
  if (yahooSymbol === '^INDIAVIX') return 'NSE:INDIAVIX';
  
  return yahooSymbol;
}

export const StockChart = memo(function StockChart({ symbol }: StockChartProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !symbol) return;
    
    // Clear previous chart to avoid duplicates on re-render
    container.current.innerHTML = '';
    
    const tvSymbol = getTVSymbol(symbol);
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "${tvSymbol}",
        "interval": "D",
        "timezone": "Asia/Kolkata",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "#0b0e14",
        "gridColor": "rgba(31, 41, 55, 0.4)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_chart",
        "support_host": "https://www.tradingview.com"
      }`;
      
    container.current.appendChild(script);
    
    return () => {
        if (container.current) {
            container.current.innerHTML = '';
        }
    };
  }, [symbol]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-indalpha-border">
      <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
        <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
      </div>
    </div>
  );
});

export default StockChart;
