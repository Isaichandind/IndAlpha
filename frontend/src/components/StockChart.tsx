import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { CandleData } from '../types';

interface StockChartProps {
  candles: CandleData[];
  loading: boolean;
  symbol: string;
}

/**
 * Sanitizes, deduplicates, and sorts candle data for lightweight-charts.
 * Handles the backend returning mixed time types (string for daily, number for intraday).
 */
function sanitizeCandles(raw: CandleData[]) {
  if (!raw || raw.length === 0) return [];

  const seen = new Set<string | number>();
  const cleaned: { time: string | number; open: number; high: number; low: number; close: number; volume: number }[] = [];

  for (const c of raw) {
    // Skip invalid entries
    if (c.time == null || c.close == null || isNaN(c.close)) continue;

    // Normalize: keep string dates as-is, coerce numeric timestamps to integers
    const timeKey = typeof c.time === 'number' ? Math.floor(c.time) : c.time;

    if (seen.has(timeKey)) continue;
    seen.add(timeKey);

    cleaned.push({
      time: timeKey,
      open: Number(c.open) || 0,
      high: Number(c.high) || 0,
      low: Number(c.low) || 0,
      close: Number(c.close) || 0,
      volume: Number(c.volume) || 0,
    });
  }

  // Sort ascending — works for both 'YYYY-MM-DD' strings and UNIX timestamps
  cleaned.sort((a, b) => {
    if (typeof a.time === 'string' && typeof b.time === 'string') return a.time.localeCompare(b.time);
    return Number(a.time) - Number(b.time);
  });

  return cleaned;
}

export function StockChart({ candles, loading, symbol }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  // Memoize sanitized data to avoid recomputation on re-renders
  const cleanCandles = useMemo(() => sanitizeCandles(candles), [candles]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || cleanCandles.length === 0) return;

    // Destroy previous chart instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Fallbacks to prevent crash if layout isn't painted yet
    const initialWidth = container.clientWidth > 0 ? container.clientWidth : 600;
    const initialHeight = container.clientHeight > 0 ? container.clientHeight : 320;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f1115' },
        textColor: '#94a3b8',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(55, 65, 81, 0.3)' },
        horzLines: { color: 'rgba(55, 65, 81, 0.3)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(16, 185, 129, 0.4)',
          labelBackgroundColor: '#10b981',
        },
        horzLine: {
          color: 'rgba(16, 185, 129, 0.4)',
          labelBackgroundColor: '#10b981',
        },
      },
      rightPriceScale: {
        borderColor: '#1f2937',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#1f2937',
        timeVisible: true, // Crucial for intraday charts
      },
      handleScroll: { vertTouchDrag: false },
      width: initialWidth,
      height: initialHeight,
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    try {
      const formattedCandles = cleanCandles.map(c => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(formattedCandles);
    } catch (err) {
      console.error('Failed to set candle data:', err);
    }

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    try {
      const volumeData = cleanCandles.map(c => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      }));
      volumeSeries.setData(volumeData);
    } catch (err) {
      console.error('Failed to set volume data:', err);
    }

    chart.timeScale().fitContent();

    // Use ResizeObserver for robust resizing
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [cleanCandles]);

  // Always render the container so ResizeObserver can attach.
  // Overlay spinner/message on top instead of replacing the element.
  return (
    <div className="relative w-full h-[320px] rounded-lg overflow-hidden">
      {/* The chart canvas target — always in the DOM */}
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-indalpha-dark/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indalpha-green border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-indalpha-muted">Loading chart data...</span>
          </div>
        </div>
      )}

      {/* No data message — only when not loading AND no candles */}
      {!loading && cleanCandles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-indalpha-dark z-10">
          <span className="text-sm text-indalpha-muted">No chart data available for {symbol}</span>
        </div>
      )}
    </div>
  );
}
