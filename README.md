# Curvehaus

Animated loaders from parametric mathematical equations. Pick a shape, change the color, copy the React component or download a transparent GIF.

Built with Next.js, Canvas 2D, and [motion/react](https://motion.dev). Inspired by [@paidax01's math-curve-loaders](https://github.com/Paidax01/math-curve-loaders).

<!-- Add screenshot: ![Curvehaus gallery](./screenshot.png) -->

## Features

- **25 curated presets** — spirographs, rose curves, Lissajous figures, superformula shapes, and special curves (lemniscate, cardioid, epicycloid, astroid)
- **Trim path animation** — a short glowing segment races along the curve using Canvas `setLineDash` + `createLinearGradient`. One path, one stroke, zero visible artifacts
- **Ghost outline** — full curve at 6% opacity via offscreen canvas compositing to prevent bright dots at self-intersections
- **Color system** — 5 base presets + custom gradient stops via inline HSV picker + angle knob to rotate the gradient within the trim
- **React export** — copy a self-contained `motion.path` component with `pathOffset` animation, ghost outline, and `useReducedMotion` accessibility
- **GIF export** — download a transparent animated GIF of any loader, rendered at 30fps for one full loop
- **DialKit editor** — full parametric control with rotary knobs for every curve parameter
- **Hover-to-play gallery** — bento grid cells show the ghost at rest, animate on hover
- **Zero scroll** — entire gallery fits in one viewport

## Demo

Visit [curvehaus.vercel.app](https://curvehaus.vercel.app) (or run locally).

## Usage

```bash
git clone https://github.com/kurkure15/Curvehaus.git
cd Curvehaus
npm install
npm run dev
```

Open `http://localhost:3000`. Click any curve in the bento grid to preview it. Click `</>` to copy the React component. Click the download icon to export a transparent GIF.

### Using the exported React component

```bash
npm install motion
```

```tsx
import { Loader } from './Loader'

function App() {
  return <Loader color="#a78bfa" size={48} />
}
```

The exported component is self-contained — one file, one SVG, no Canvas dependency. It uses `motion.path` with `pathOffset` for the trim animation and includes a ghost outline at 6% opacity. Supports `prefers-reduced-motion` out of the box.

### GIF export

Click the download button on any preset to get a transparent animated GIF. The GIF captures one full animation loop at 30fps. Background is transparent so you can place it on any surface.

> **Note:** GIF only supports 1-bit transparency, so anti-aliased edges may appear slightly dithered against transparent backgrounds. On solid backgrounds it looks clean.

## DialKit Editor

Click the pencil icon on any preset to open the parametric editor. Every curve parameter is controlled by rotary knobs — drag to adjust values in real-time.

### Editor controls

| Curve Type | Knobs |
|------------|-------|
| Hypotrochoid | Ring teeth (R), Cog teeth (r), Pen hole (d) |
| Rose | Petals (k), Offset |
| Lissajous | Freq X (a), Freq Y (b), Phase |
| Superformula | Symmetry (m), Roundness (n₁), Sharpness (n₂) |
| Custom | Text input → traces the outline of any word |

### Editor workflow

1. **Pick a starting preset** from the gallery (or start from scratch)
2. **Twist the knobs** — each parameter updates the curve in real-time on the canvas
3. **Switch curve types** — the knobs adapt to show relevant parameters
4. **Adjust colors** — same color system as the gallery (base color, gradient stops, angle knob)
5. **Copy React** — exports the current editor state as a `motion.path` component
6. **Download GIF** — captures the current animation as a transparent GIF

The editor passes the active preset via URL query params (`/editor?preset=5`), so clicking the edit icon on "Petal Bloom" opens the editor pre-loaded with those exact parameters.

## Presets

### Spirograph
| Name | Type | Params |
|------|------|--------|
| Thinking | Hypotrochoid | R=96, r=60, d=0.75 |
| Rose Five | Rose | k=5 |
| Rose Three | Rose | k=3 |
| Rose Seven | Rose | k=7 |
| Petal Bloom | Rose | k=3, offset=1.0 |
| Double Rose | Rose | k=4 |
| Quad Star | Hypotrochoid | R=64, r=48, d=0.75 |
| Hex Ring | Hypotrochoid | R=72, r=60, d=0.8 |
| Tri Loop | Hypotrochoid | R=48, r=16, d=0.85 |
| Gear | Hypotrochoid | R=96, r=80, d=0.72 |
| Compact | Hypotrochoid | R=60, r=36, d=0.7 |

### Lissajous
| Name | Params |
|------|--------|
| Drift | a=3, b=2, phase=1.5 |
| Infinity | a=1, b=2, phase=0 |
| Wave Knot | a=5, b=4, phase=0.5 |
| Bowtie | a=2, b=3, phase=1.5 |

### Superformula
| Name | Params |
|------|--------|
| Superflower | m=5, n₁=0.3, n₂=1.7 |
| Supergem | m=8, n₁=0.4, n₂=1.7 |
| Triangle | m=3, n₁=0.5, n₂=1.0 |
| Hexagon | m=6, n₁=0.8, n₂=1.5 |
| Star | m=5, n₁=0.1, n₂=1.7 |

### Special
| Name | Equation |
|------|----------|
| Lemniscate | x=cos(t)/(1+sin²t), y=sin(t)cos(t)/(1+sin²t) |
| Cardioid | x=(1+cos t)cos t, y=(1+cos t)sin t |
| Epicycloid | x=4cos t−cos 4t, y=4sin t−sin 4t |
| Astroid | x=cos³t, y=sin³t |

## How it works

### Curve generation

Each curve type has a parametric generator that outputs `[x, y]` coordinate pairs:

- **Hypotrochoid** — `x = (R−r)cos t + d·cos((R−r)/r·t)` with adaptive step count based on lobe complexity
- **Rose** — `r = cos(k·t) + offset`, converted to Cartesian
- **Lissajous** — `x = sin(a·t + phase), y = sin(b·t)`
- **Superformula** — `r = (|cos(m·t/4)|^n₂ + |sin(m·t/4)|^n₂)^(−1/n₁)`
- **Custom** — traces the outline of arbitrary text using canvas pixel edge detection

All points are normalized to fit within 68% of a unit square, centered at (0.5, 0.5).

### Rendering pipeline

1. **Ghost** — draw the full path at full opacity on an offscreen canvas, then stamp at `globalAlpha = 0.06`. Prevents bright circles at self-intersection points.

2. **Trim path** — one `beginPath`, all `lineTo`s, one `stroke()`. Visibility controlled by `setLineDash` with animated `lineDashOffset`. Gradient colors via `createLinearGradient` as `strokeStyle`.

3. **React export** — points converted to SVG `d` attribute. Animation via `motion.path` with `pathLength="1"` and `pathOffset` keyframes.

4. **GIF export** — offscreen canvas renders each frame with transparent background. Encoded with gif.js worker-based encoder at 30fps.

## Project structure

```
src/
  app/
    page.tsx              ← Gallery homepage
    editor/page.tsx       ← DialKit parametric editor
    test-export/page.tsx  ← Export verification page
  lib/
    curves.ts             ← gen(), norm(), cumLen(), ptAt()
    presets.ts            ← 25 presets in 4 sections
    renderer.ts           ← drawGhost(), drawTrim(), renderLoader()
    exports.ts            ← React export, pointsToSvgPath()
    gif-export.ts         ← GIF encoding and download
    editor-curves.ts      ← Editor curve generators with DialKit params
    editor-exports.ts     ← Editor-specific exports
    math.ts               ← gcd(), normalizePoints()
  components/
    Hero.tsx              ← Hero showcase canvas
    ColorControls.tsx     ← Colors, gradient, picker, angle knob
    BentoGrid.tsx         ← Preset picker grid
    BentoCell.tsx         ← Individual cell with hover animation
```

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) for rendering
- [motion/react](https://motion.dev) for exported React components
- [gif.js](https://jnordberg.github.io/gif.js/) for GIF encoding
- [Sonner](https://sonner.emilkowal.ski) for toast notifications
- [Vercel](https://vercel.com) for deployment

## Credits

- Curve math: [Spirograph](https://en.wikipedia.org/wiki/Spirograph), [Superformula](https://en.wikipedia.org/wiki/Superformula)
- Gallery concept: [@paidax01/math-curve-loaders](https://github.com/Paidax01/math-curve-loaders)
- Editor controls: [DialKit](https://dialkit.dev)
- Toast: [Sonner](https://sonner.emilkowal.ski) by Emil Kowalski

## License

MIT
