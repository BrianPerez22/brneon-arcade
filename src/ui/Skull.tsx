// Calavera pixel-art en SVG (usa currentColor, así toma el color del botón que la contiene).
const BITMAP = [
  '....########....',
  '..############..',
  '.##############.',
  '.##############.',
  '################',
  '##....####....##',
  '##....####....##',
  '###..######..###',
  '################',
  '######.##.######',
  '.######..######.',
  '..############..',
  '..##.##..##.##..',
  '..##.##..##.##..',
  '...##.####.##...',
];

const PATH = BITMAP.map((row, y) => {
  let d = '';
  for (let x = 0; x < row.length; x++) if (row[x] === '#') d += `M${x} ${y}h1v1h-1z`;
  return d;
}).join('');

export default function Skull({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={'skull ' + className} viewBox="0 0 16 15" width={size} height={size * (15 / 16)} shapeRendering="crispEdges" aria-hidden focusable="false">
      <path d={PATH} fill="currentColor" />
    </svg>
  );
}
