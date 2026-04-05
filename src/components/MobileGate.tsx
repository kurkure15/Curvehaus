'use client';

export default function MobileGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop: show app */}
      <div className="hidden md:contents">{children}</div>

      {/* Mobile: show message */}
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center md:hidden" style={{ background: '#09090b' }}>
        <svg viewBox="0 0 100 100" fill="none" width={80} height={80}>
          <path d="M50 15 C60 15, 85 30, 85 50 C85 70, 60 85, 50 85 C40 85, 15 70, 15 50 C15 30, 40 15, 50 15Z"
            stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" opacity="0.12" />
          <path d="M50 15 C60 15, 85 30, 85 50"
            stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <h1 className="text-[18px] font-bold" style={{ color: '#fafafa' }}>Curvehaus</h1>
        <p className="text-[14px] leading-relaxed" style={{ color: '#a1a1aa' }}>
          Best experienced on desktop.
        </p>
        <p className="text-[12px]" style={{ color: '#52525b' }}>
          Open on a wider screen to explore the full gallery and editor.
        </p>
      </div>
    </>
  );
}
