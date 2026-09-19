'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { L2DepthChart } from './L2DepthChart';
import PriceChart from './PriceChart';
import ControlPowerDetails from './ControlPowerDetails';

// ── Panel definitions ─────────────────────────────────────────────────────────

type CarouselPanelId = 'depth' | 'price' | 'power';

interface CarouselPanel {
  id: CarouselPanelId;
  title: string;
}

const panels: CarouselPanel[] = [
  {
    id: 'depth',
    title: 'L2 Order Book Depth',
  },
  {
    id: 'price',
    title: 'Price & State History',
  },
  {
    id: 'power',
    title: 'Grid Topology',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * FeatureCarousel — 3-panel manual carousel showing:
 *   - L2 Order Book Depth
 *   - Price & State History
 *   - Grid Topology
 *
 * Width: 70 % on lg+, full-width below lg.
 * No auto-advance; left chevron disabled at panel 0, right chevron at panel 2.
 *
 * Requirements: 6.1–6.10
 */
export function FeatureCarousel() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const goToPrevious = () =>
    setCurrentIndex((prev) => Math.max(0, prev - 1));

  const goToNext = () =>
    setCurrentIndex((prev) => Math.min(panels.length - 1, prev + 1));

  const currentPanel = panels[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === panels.length - 1;

  return (
    <div className="w-full lg:w-[70%]">
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        {/* ── Header: title + chevron navigation ───────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {currentPanel.title}
          </h2>

          <div className="flex items-center gap-1" role="group" aria-label="Carousel navigation">
            {/* Left chevron */}
            <button
              onClick={goToPrevious}
              disabled={isFirst}
              aria-label="Previous panel"
              className={`p-2 rounded-md transition-colors ${
                isFirst
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Right chevron */}
            <button
              onClick={goToNext}
              disabled={isLast}
              aria-label="Next panel"
              className={`p-2 rounded-md transition-colors ${
                isLast
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Panel body ────────────────────────────────────────────────────── */}
        {/*
          Minimum height of 400px prevents layout shift when switching panels.
          Each panel renders its dedicated chart/detail component.
        */}
        <div className="min-h-[400px]">
          {currentPanel.id === 'depth' && <L2DepthChart />}
          {currentPanel.id === 'price' && <PriceChart />}
          {currentPanel.id === 'power' && <ControlPowerDetails />}
        </div>

        {/* ── Panel dot indicators ──────────────────────────────────────────── */}
        <div
          className="flex justify-center gap-2 mt-4"
          role="tablist"
          aria-label="Carousel panels"
        >
          {panels.map((panel, index) => (
            <button
              key={panel.id}
              onClick={() => setCurrentIndex(index)}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to ${panel.title}`}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
