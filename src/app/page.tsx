'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { PRESETS } from '@/lib/presets';
import { generatePoints, CurveType, CurveParams } from '@/lib/curves';
import MiniLoader from '@/components/MiniLoader';

function buildParams(type: string, overrides: Record<string, number | string>): CurveParams {
  const cp: CurveParams = {
    a: 96, b: 60, c: 0.75, d: 2, n1: 0.3, n2: 1.7, n3: 1.7, m: 5,
    petals: 5, stepAngle: 71,
    customX: 'sin(3*t)*cos(t)', customY: 'sin(2*t)', customRange: 6.28,
  };
  for (const [k, v] of Object.entries(overrides)) {
    if (k in cp && typeof v === 'number') (cp as unknown as Record<string, number>)[k] = v;
    if (k in cp && typeof v === 'string') (cp as unknown as Record<string, string>)[k] = v;
  }
  return cp;
}

export default function Gallery() {
  return (
    <div className="mx-auto max-w-[1200px] px-6">
      {/* Header */}
      <header className="max-w-[640px] pb-12 pt-20">
        <h1 className="text-[36px] font-semibold tracking-[-0.02em] text-[#fafafa]">
          Curvehaus
        </h1>
        <p className="mt-2 text-[15px] text-[#a1a1a1]">
          Mathematical curve loaders. Pick one. Copy the code.
        </p>
      </header>

      {/* Gallery grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 pb-20">
        {PRESETS.map((preset, index) => (
          <GalleryCard key={preset.id} preset={preset} index={index} />
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#262626] py-8 text-center text-[13px] text-[#a1a1a1]">
        Built with math.
      </footer>
    </div>
  );
}

function GalleryCard({ preset, index }: { preset: typeof PRESETS[number]; index: number }) {
  const params = useMemo(() => buildParams(preset.curveType, preset.params), [preset]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index * 0.04, 0.28),
      }}
    >
      <Link
        href={`/editor?preset=${preset.id}`}
        className="group relative block aspect-square overflow-hidden rounded-xl border border-[#262626] bg-[#141414] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#404040] active:scale-[0.98] active:duration-0"
      >
        {/* Loader animation */}
        <div className="flex h-full w-full items-center justify-center p-8 text-white">
          <MiniLoader
            curveType={preset.curveType as CurveType}
            params={params}
            speed={0.8}
          />
        </div>

        {/* Info overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3.5 pb-3 pt-8">
          <span className="block text-[13px] font-medium text-[#fafafa]">{preset.name}</span>
          <span className="mt-0.5 block text-[11px] text-[#a1a1a1]" style={{ fontFamily: 'var(--font-geist-mono)' }}>
            {preset.formula}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
