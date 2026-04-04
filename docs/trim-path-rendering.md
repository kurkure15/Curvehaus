# Trim Path Rendering — What Worked

## The Problem

Animating a "comet trail" along a mathematical curve on Canvas. The trail should look like one smooth continuous glowing stroke racing around a ghost outline — like a loading spinner.

## What Didn't Work

### Individual segments (60 separate strokes)
```js
for (let i = 0; i < 60; i++) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke(); // ← each stroke gets its own round lineCap
}
```
**Result:** Visible chain of overlapping circles on tight curves. Each short segment's `lineCap: 'round'` becomes a visible dot.

### Bands (12 grouped strokes)
Grouped segments into 12 bands, each drawn as one `beginPath → many lineTo → stroke`.
**Result:** Visible seams between bands. Even with +2px overlap, dash boundaries don't align pixel-perfectly.

### Stacked opacity layers (5-8 full-path strokes)
Drew the full path multiple times at low alpha, each starting further toward the head.
**Result:** Still multiple `stroke()` calls. Round caps at each layer's start/end were visible as bumps.

### Color bands for gradient (N separate strokes with setLineDash)
Split the trim into N color bands, each using `setLineDash` on the full path.
**Result:** Micro-gaps between bands visible as breaks in the stroke. Even +4px overlap couldn't fully hide them.

## What Worked

### `setLineDash` + `createLinearGradient` on ONE continuous path

**Key insight:** Canvas `setLineDash([visible, gap])` + `lineDashOffset` controls which portion of a path is visible. Combined with `createLinearGradient` as the `strokeStyle`, you get:

- **1 `beginPath`** — all curve points connected with `lineTo`
- **1 `stroke`** — Canvas draws the entire dash pattern in one call
- **1 gradient** — `createLinearGradient` blends colors internally, zero seams

```js
// Build ONE continuous path from all curve points
ctx.beginPath();
ctx.moveTo(pxX[0], pxY[0]);
for (let i = 1; i < pts.length; i++) ctx.lineTo(pxX[i], pxY[i]);

// setLineDash: [visible segment length, invisible gap]
ctx.setLineDash([trimLen, pixLen - trimLen]);

// lineDashOffset: positions the visible segment along the path
ctx.lineDashOffset = -(tailPos % pixLen);

// strokeStyle: solid color OR createLinearGradient
if (hasGradient) {
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.strokeStyle = grad;
} else {
  ctx.strokeStyle = solidColor;
}

ctx.lineWidth = lw;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.stroke();
ctx.setLineDash([]);
```

### Why it works
1. **One stroke call** — Canvas handles all internal joins smoothly via `lineJoin: 'round'`. No individual segment caps.
2. **setLineDash is native** — the dash pattern is applied during rasterization, not as separate draw calls. The visible/invisible boundary is pixel-perfect.
3. **Gradient is native** — `createLinearGradient` blends colors in the GPU. Zero seams, zero bands.

### Gradient direction control
The gradient direction is controlled by an angle knob (0-360°). The `createLinearGradient` vector rotates around the canvas center:

```js
const rad = (angleDeg - 90) * Math.PI / 180;
const cx = sz / 2, cy = sz / 2, len = sz * 0.5;
const grad = ctx.createLinearGradient(
  cx - Math.cos(rad) * len, cy - Math.sin(rad) * len,
  cx + Math.cos(rad) * len, cy + Math.sin(rad) * len,
);
```

This rotates the color direction independently from the trim's travel direction.

### Ghost outline
The ghost (full shape at low opacity) uses an **offscreen canvas trick** to prevent bright spots at self-intersection points:

```js
const off = document.createElement('canvas');
// draw full path at full opacity on offscreen canvas
// then stamp onto main canvas at globalAlpha = 0.06
ctx.globalAlpha = 0.06;
ctx.drawImage(off, 0, 0);
```

### Current parameters
- **Trim length:** 8% of total path (`trimFrac = 0.08`)
- **Speed multiplier:** 0.30
- **Stroke width:** 5.5% of canvas size (`0.055 * sz`)
- **Ghost opacity:** 0.06

### Animation
- `progress = (time * speed * totalArcLen * 0.30) % totalArcLen`
- `headDist` and `tailDist` computed from progress
- `lineDashOffset` updated every frame to advance the trim
- `requestAnimationFrame` loop

## Summary

| Approach | Strokes per frame | Visible artifacts |
|----------|------------------|-------------------|
| Individual segments | 60 | Circle chain |
| Bands | 12 | Seams between bands |
| Stacked layers | 5-8 | Bumps at layer edges |
| Color bands + setLineDash | N | Micro-gaps |
| **setLineDash + gradient** | **1** | **None** |
