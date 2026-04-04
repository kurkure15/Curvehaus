export interface GalleryPreset {
  id: number;
  name: string;
  formula: string;
  curveType: string;
  params: Record<string, number | string>;
  color: string;
}

export const PRESETS: GalleryPreset[] = [
  // ROSE FAMILY
  { id: 1, name: 'Thinking', formula: '(R−r)cos t + d·cos((R−r)/r·t)', curveType: 'hypotrochoid', params: { a: 96, b: 60, c: 0.75 }, color: '#ffffff' },
  { id: 2, name: 'Bloom', formula: '(R−r)cos t + d·cos((R−r)/r·t)', curveType: 'hypotrochoid', params: { a: 96, b: 52, c: 0.85 }, color: '#ffffff' },
  { id: 3, name: 'Rose Five', formula: 'r = cos(5\u03b8)', curveType: 'rose', params: { petals: 5, a: 0 }, color: '#ffffff' },
  { id: 4, name: 'Rose Three', formula: 'r = cos(3\u03b8)', curveType: 'rose', params: { petals: 3, a: 0 }, color: '#ffffff' },
  { id: 5, name: 'Rose Seven', formula: 'r = cos(7\u03b8)', curveType: 'rose', params: { petals: 7, a: 0 }, color: '#ffffff' },
  { id: 6, name: 'Rose Orbit', formula: 'r = cos(5\u03b8) + 0.5', curveType: 'rose', params: { petals: 5, a: 0.5 }, color: '#ffffff' },
  { id: 7, name: 'Petal Bloom', formula: 'r = cos(3\u03b8) + 1.0', curveType: 'rose', params: { petals: 3, a: 1.0 }, color: '#ffffff' },
  { id: 8, name: 'Double Rose', formula: 'r = cos(4\u03b8)', curveType: 'rose', params: { petals: 4, a: 0 }, color: '#ffffff' },

  // SPIROGRAPH FAMILY
  { id: 9, name: 'Spirograph Star', formula: 'Spirograph 96/60', curveType: 'hypotrochoid', params: { a: 96, b: 60, c: 0.75 }, color: '#ffffff' },
  { id: 10, name: 'Tri Loop', formula: 'Spirograph 48/16', curveType: 'hypotrochoid', params: { a: 48, b: 16, c: 0.85 }, color: '#ffffff' },
  { id: 11, name: 'Quad Star', formula: 'Spirograph 64/48', curveType: 'hypotrochoid', params: { a: 64, b: 48, c: 0.75 }, color: '#ffffff' },
  { id: 12, name: 'Hex Ring', formula: 'Spirograph 72/60', curveType: 'hypotrochoid', params: { a: 72, b: 60, c: 0.8 }, color: '#ffffff' },
  { id: 13, name: 'Atom', formula: 'Spirograph 48/10', curveType: 'hypotrochoid', params: { a: 48, b: 10, c: 0.9 }, color: '#ffffff' },
  { id: 14, name: 'Gear', formula: 'Spirograph 96/80', curveType: 'hypotrochoid', params: { a: 96, b: 80, c: 0.72 }, color: '#ffffff' },
  { id: 15, name: 'Starburst', formula: 'Spirograph 64/40', curveType: 'hypotrochoid', params: { a: 64, b: 40, c: 1.0 }, color: '#ffffff' },

  // LISSAJOUS FAMILY
  { id: 16, name: 'Lissajous Drift', formula: 'sin(3t+1.5), sin(2t)', curveType: 'lissajous', params: { b: 3, d: 2, c: 1.5 }, color: '#ffffff' },
  { id: 17, name: 'Infinity', formula: 'sin(t), sin(2t)', curveType: 'lissajous', params: { b: 1, d: 2, c: 0 }, color: '#ffffff' },
  { id: 18, name: 'Clover', formula: 'sin(3t+1), sin(4t)', curveType: 'lissajous', params: { b: 3, d: 4, c: 1.0 }, color: '#ffffff' },
  { id: 19, name: 'Wave Knot', formula: 'sin(5t+0.5), sin(4t)', curveType: 'lissajous', params: { b: 5, d: 4, c: 0.5 }, color: '#ffffff' },
  { id: 20, name: 'Bowtie', formula: 'sin(2t+1.5), sin(3t)', curveType: 'lissajous', params: { b: 2, d: 3, c: 1.5 }, color: '#ffffff' },

  // SUPERFORMULA FAMILY
  { id: 21, name: 'Superflower', formula: 'Superformula m=5', curveType: 'superformula', params: { m: 5, n1: 0.3, n2: 1.7 }, color: '#ffffff' },
  { id: 22, name: 'Supergem', formula: 'Superformula m=8', curveType: 'superformula', params: { m: 8, n1: 0.4, n2: 1.7 }, color: '#ffffff' },
  { id: 23, name: 'Triangle', formula: 'Superformula m=3', curveType: 'superformula', params: { m: 3, n1: 0.5, n2: 1.0 }, color: '#ffffff' },
  { id: 24, name: 'Hexagon', formula: 'Superformula m=6', curveType: 'superformula', params: { m: 6, n1: 0.8, n2: 1.5 }, color: '#ffffff' },
  { id: 25, name: 'Star', formula: 'Superformula m=5', curveType: 'superformula', params: { m: 5, n1: 0.1, n2: 1.7 }, color: '#ffffff' },

  // SPECIAL CURVES
  { id: 26, name: 'Lemniscate', formula: '\u221e Bernoulli', curveType: 'custom', params: { customX: 'cos(t)/(1+sin(t)*sin(t))', customY: 'sin(t)*cos(t)/(1+sin(t)*sin(t))', customRange: 6.28 }, color: '#ffffff' },
  { id: 27, name: 'Cardioid', formula: 'r = 1+cos(\u03b8)', curveType: 'custom', params: { customX: '(1+cos(t))*cos(t)', customY: '(1+cos(t))*sin(t)', customRange: 6.28 }, color: '#ffffff' },
  { id: 28, name: 'Spiral', formula: 'Archimedean', curveType: 'custom', params: { customX: 't*cos(t*6.28)/10', customY: 't*sin(t*6.28)/10', customRange: 3 }, color: '#ffffff' },
  { id: 29, name: 'Epicycloid', formula: '3-cusp epicycloid', curveType: 'custom', params: { customX: '4*cos(t)-cos(4*t)', customY: '4*sin(t)-sin(4*t)', customRange: 6.28 }, color: '#ffffff' },
  { id: 30, name: 'Astroid', formula: 'x\u00b3 + y\u00b3 = 1', curveType: 'custom', params: { customX: 'pow(cos(t),3)', customY: 'pow(sin(t),3)', customRange: 6.28 }, color: '#ffffff' },
];
