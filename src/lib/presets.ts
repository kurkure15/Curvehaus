import type { CurveType } from './curves';

export interface Preset {
  id: number;
  name: string;
  type: CurveType;
  params: (number | string)[];
  section: string;
}

export const SECTIONS = [
  {
    title: 'SPIROGRAPH',
    presets: [
      { id: 1, name: 'Thinking', type: 'h' as CurveType, params: [96, 60, 0.75] },
      { id: 2, name: 'Rose Five', type: 'r' as CurveType, params: [5, 0] },
      { id: 3, name: 'Rose Three', type: 'r' as CurveType, params: [3, 0] },
      { id: 4, name: 'Rose Seven', type: 'r' as CurveType, params: [7, 0] },
      { id: 5, name: 'Petal Bloom', type: 'r' as CurveType, params: [3, 1.0] },
      { id: 6, name: 'Double Rose', type: 'r' as CurveType, params: [4, 0] },
      { id: 7, name: 'Quad Star', type: 'h' as CurveType, params: [64, 48, 0.75] },
      { id: 8, name: 'Hex Ring', type: 'h' as CurveType, params: [72, 60, 0.8] },
      { id: 9, name: 'Tri Loop', type: 'h' as CurveType, params: [48, 16, 0.85] },
      { id: 10, name: 'Gear', type: 'h' as CurveType, params: [96, 80, 0.72] },
      { id: 11, name: 'Compact', type: 'h' as CurveType, params: [60, 36, 0.7] },
    ],
  },
  {
    title: 'LISSAJOUS',
    presets: [
      { id: 12, name: 'Drift', type: 'l' as CurveType, params: [3, 2, 1.5] },
      { id: 13, name: 'Infinity', type: 'l' as CurveType, params: [1, 2, 0] },
      { id: 14, name: 'Wave Knot', type: 'l' as CurveType, params: [5, 4, 0.5] },
      { id: 15, name: 'Bowtie', type: 'l' as CurveType, params: [2, 3, 1.5] },
    ],
  },
  {
    title: 'SUPERFORMULA',
    presets: [
      { id: 16, name: 'Superflower', type: 's' as CurveType, params: [5, 0.3, 1.7] },
      { id: 17, name: 'Supergem', type: 's' as CurveType, params: [8, 0.4, 1.7] },
      { id: 18, name: 'Triangle', type: 's' as CurveType, params: [3, 0.5, 1.0] },
      { id: 19, name: 'Hexagon', type: 's' as CurveType, params: [6, 0.8, 1.5] },
      { id: 20, name: 'Star', type: 's' as CurveType, params: [5, 0.1, 1.7] },
    ],
  },
  {
    title: 'SPECIAL',
    presets: [
      { id: 21, name: 'Lemniscate', type: 'e' as CurveType, params: ['cos(t)/(1+sin(t)*sin(t))', 'sin(t)*cos(t)/(1+sin(t)*sin(t))', 6.28] },
      { id: 22, name: 'Cardioid', type: 'e' as CurveType, params: ['(1+cos(t))*cos(t)', '(1+cos(t))*sin(t)', 6.28] },
      { id: 23, name: 'Epicycloid', type: 'e' as CurveType, params: ['4*cos(t)-cos(4*t)', '4*sin(t)-sin(4*t)', 6.28] },
      { id: 24, name: 'Astroid', type: 'e' as CurveType, params: ['pow(cos(t),3)', 'pow(sin(t),3)', 6.28] },
    ],
  },
];

export const ALL_PRESETS = SECTIONS.flatMap(s => s.presets.map(p => ({ ...p, section: s.title })));
