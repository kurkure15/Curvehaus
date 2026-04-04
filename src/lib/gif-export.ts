import GIF from 'gif.js';
import { drawGhost, drawTrim } from './renderer';

export async function exportGIF(
  pts: [number, number][],
  L: number[],
  speed: number,
  baseColor: string,
  gradientStops: string[],
  gradientAngle: number,
  size: number = 300,
  bgColor: string = '#09090b',
): Promise<Blob> {
  const loopDuration = 1 / ((speed || 1) * 0.30);
  const fps = 30;
  const totalFrames = Math.ceil(loopDuration * fps);
  const delay = Math.round(1000 / fps);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: size,
    height: size,
    workerScript: '/gif.worker.js',
  });

  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / fps;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    drawGhost(ctx, size, pts, baseColor);
    drawTrim(ctx, size, pts, L, time, speed, baseColor, gradientStops, gradientAngle);
    gif.addFrame(ctx, { copy: true, delay });
  }

  return new Promise((resolve) => {
    gif.on('finished', (blob: Blob) => resolve(blob));
    gif.render();
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
