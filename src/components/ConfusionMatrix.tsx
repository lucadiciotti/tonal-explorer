import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

const DEGREES = ['#4', 'b2', 'b6', 'b3', 'b7', '4', '1', '5', '2', '6', '3', '7'] as const;
type Degree = typeof DEGREES[number];

const NOTE_TO_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 5, 'F': 5,
  'E#': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 0, 'B#': 0,
};

const SEMITONE_TO_DEGREE_INDEX: Record<number, number> = {
  6: 0, 1: 1, 8: 2, 3: 3, 10: 4, 5: 5,
  0: 6, 7: 7, 2: 8, 9: 9, 4: 10, 11: 11,
};

type StatMode = 'mean' | 'median' | 'min' | 'max';
type Band = 'below' | 'same' | 'above';

interface BandData {
  times: (number | null)[];
}

interface CellData {
  below: BandData;
  same: BandData;
  above: BandData;
}

export interface NoteRow {
  degree: string;
  played_note?: string | null;
  playedNote?: string | null;
  expected_note?: string | null;
  expectedNote?: string | null;
  is_correct?: boolean;
  isCorrect?: boolean;
  reaction_time_ms?: number | null;
  reactionTimeMs?: number | null;
}

interface ConfusionMatrixProps {
  notes: NoteRow[];
  tonic: string;
}

interface Selection {
  rowIdx: number;
  colIdx: number;
  band: Band;
}

const BAND_LABELS: Record<Band, string> = {
  above: 'Ottava superiore',
  same: 'Ottava corretta',
  below: 'Ottava inferiore',
};

function parseNote(noteStr: string): { note: string; octave: number } | null {
  const match = noteStr.match(/^([A-Ga-g][#b]?)(\d)$/);
  if (!match) return null;
  return { note: match[1], octave: parseInt(match[2], 10) };
}

function noteToIndex(noteStr: string, tonic: string): number | null {
  const parsed = parseNote(noteStr);
  if (!parsed) return null;
  const noteSemitones = NOTE_TO_SEMITONES[parsed.note];
  const tonicSemitones = NOTE_TO_SEMITONES[tonic];
  if (noteSemitones === undefined || tonicSemitones === undefined) return null;
  const interval = ((noteSemitones - tonicSemitones) % 12 + 12) % 12;
  return SEMITONE_TO_DEGREE_INDEX[interval] ?? null;
}

function degreeToIndex(degree: string): number {
  const clean = degree.startsWith('_') || degree.startsWith('^') ? degree.slice(1) : degree;
  return DEGREES.indexOf(clean as Degree);
}

function computeAllStats(rawTimes: (number | null)[]) {
  const times = rawTimes.filter((t): t is number => t !== null);
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const stddev = Math.sqrt(times.reduce((acc, t) => acc + (t - mean) ** 2, 0) / times.length);
  return {
    count: times.length,
    total: rawTimes.length,
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stddev,
  };
}

function computeStat(rawTimes: (number | null)[], mode: StatMode): number | null {
  const times = rawTimes.filter((t): t is number => t !== null);
  if (times.length === 0) return null;
  if (mode === 'min') return Math.min(...times);
  if (mode === 'max') return Math.max(...times);
  if (mode === 'mean') return times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function reactionTimeColor(ms: number): string {
  const t = Math.min(ms / 4000, 1);
  if (t <= 0.5) {
    const u = t / 0.5;
    const r = Math.round(21 + u * (202 - 21));
    const g = Math.round(128 + u * (138 - 128));
    const b = Math.round(61 + u * (4 - 61));
    return `rgb(${r},${g},${b})`;
  } else {
    const u = (t - 0.5) / 0.5;
    const r = Math.round(202 + u * (220 - 202));
    const g = Math.round(138 + u * (38 - 138));
    const b = Math.round(4 + u * (38 - 4));
    return `rgb(${r},${g},${b})`;
  }
}

const STAT_OPTIONS: { value: StatMode; label: string }[] = [
  { value: 'mean', label: 'Media' },
  { value: 'median', label: 'Mediana' },
  { value: 'min', label: 'Minimo' },
  { value: 'max', label: 'Massimo' },
];

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">{value}</span>
    </div>
  );
}

function fmt(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

// SVG cell: diagonal stripe = "same", top-right triangle = "above", bottom-left triangle = "below"
// Diagonal goes from bottom-left (0,S) to top-right (S,0), stripe has thickness T on each side.
// S = cell size, T = half-thickness of diagonal stripe in pixels.
const S = 40;
const T = S * 0.147;

// Diagonal from (0,0) top-left to (S,S) bottom-right.
// Direction vector: (1,1)/√2. Perpendicular: (1,-1)/√2.
// Stripe: parallelogram of width 2T centred on this diagonal.
// Perpendicular offset: dx = T/√2, dy = T/√2  (but in opposite directions)
const sq2 = Math.SQRT2;
const dp = T / sq2;

/// Stripe: parallelogram along TL→BR diagonal, half-width dp (perpendicular direction (1,-1)/√2).
// Endpoints are extended by dp beyond (0,0) and (S,S) along the diagonal so the
// SVG viewBox clip fills the TL and BR corner triangles that would otherwise be white.
// along-diagonal unit: (1,1)/√2  →  component dp in each axis
// perp unit: (1,-1)/√2           →  component dp in each axis (sign alternates)
const ext = dp; // how far to extend endpoints past the cell corners
const stripePoints = [
  // TL end of stripe, shifted toward top-right (perp +)
  { x: 0 - ext + dp, y: 0 - ext - dp },
  // BR end of stripe, shifted toward top-right (perp +)
  { x: S + ext + dp, y: S + ext - dp },
  // BR end of stripe, shifted toward bottom-left (perp -)
  { x: S + ext - dp, y: S + ext + dp },
  // TL end of stripe, shifted toward bottom-left (perp -)
  { x: 0 - ext - dp, y: 0 - ext + dp },
].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

// Top-right triangle (above the TL→BR diagonal): (0,0), (S,0), (S,S)
// Bottom-left triangle (below the TL→BR diagonal): (0,0), (0,S), (S,S)
// Draw order: triangles first, stripe on top.
// "above" = ottava superiore → top-right triangle
// "below" = ottava inferiore → bottom-left triangle
const abovePoints = `0,0 ${S},0 ${S},${S}`;
const belowPoints = `0,0 0,${S} ${S},${S}`;

interface CellSvgProps {
  cell: CellData;
  statMode: StatMode;
  isDiagonal: boolean;
  isSelected: boolean;
  selectedBand: Band | null;
  onBandClick: (band: Band) => void;
}

function CellSvg({ cell, statMode, isDiagonal, isSelected, selectedBand, onBandClick }: CellSvgProps) {
  const colorFor = (times: (number | null)[]) => {
    if (times.length === 0) return null;
    const val = computeStat(times, statMode);
    return val !== null ? reactionTimeColor(val) : null;
  };

  const aboveColor = colorFor(cell.above.times);
  const sameColor = colorFor(cell.same.times);
  const belowColor = colorFor(cell.below.times);

  const isEmpty = !aboveColor && !sameColor && !belowColor;

  const ringColor = isDiagonal ? '#94a3b8' : '#e2e8f0';
  const borderWidth = isDiagonal ? 2 : 1;

  const titleFor = (band: Band, times: (number | null)[]) => {
    if (times.length === 0) return 'Nessun dato';
    const val = computeStat(times, statMode);
    return `${BAND_LABELS[band]} — ${val !== null ? Math.round(val) + 'ms' : '?'} (n=${times.length})`;
  };

  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      className="block flex-shrink-0"
      style={{
        outline: `${borderWidth}px solid ${ringColor}`,
        outlineOffset: '-1px',
        boxSizing: 'border-box',
        background: isEmpty ? '#f8fafc' : '#f1f5f9',
        filter: isSelected ? 'brightness(1.12)' : undefined,
      }}
    >
      {/* Above triangle (top-right) */}
      <polygon
        points={abovePoints}
        fill={aboveColor ?? 'transparent'}
        opacity={aboveColor ? 1 : 0}
        className={cell.above.times.length > 0 ? 'cursor-pointer' : ''}
        style={{ outline: selectedBand === 'above' ? '2px solid white' : undefined }}
        onClick={cell.above.times.length > 0 ? () => onBandClick('above') : undefined}
      >
        <title>{titleFor('above', cell.above.times)}</title>
      </polygon>

      {/* Below triangle (bottom-left) */}
      <polygon
        points={belowPoints}
        fill={belowColor ?? 'transparent'}
        opacity={belowColor ? 1 : 0}
        className={cell.below.times.length > 0 ? 'cursor-pointer' : ''}
        onClick={cell.below.times.length > 0 ? () => onBandClick('below') : undefined}
      >
        <title>{titleFor('below', cell.below.times)}</title>
      </polygon>

      {/* Diagonal stripe (same octave) — drawn on top */}
      <polygon
        points={stripePoints}
        fill={sameColor ?? (isEmpty ? 'transparent' : '#e2e8f0')}
        opacity={sameColor || !isEmpty ? 1 : 0}
        className={cell.same.times.length > 0 ? 'cursor-pointer' : ''}
        onClick={cell.same.times.length > 0 ? () => onBandClick('same') : undefined}
      >
        <title>{titleFor('same', cell.same.times)}</title>
      </polygon>

      {/* Selection highlight ring */}
      {isSelected && (
        <rect
          x={1} y={1} width={S - 2} height={S - 2}
          fill="none"
          stroke="rgb(56 189 248)"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

export function ConfusionMatrix({ notes, tonic }: ConfusionMatrixProps) {
  const [statMode, setStatMode] = useState<StatMode>('mean');
  const [selection, setSelection] = useState<Selection | null>(null);

  const { matrix, hasAnyData } = useMemo(() => {
    const m: CellData[][] = Array.from({ length: 12 }, () =>
      Array.from({ length: 12 }, () => ({
        below: { times: [] },
        same: { times: [] },
        above: { times: [] },
      }))
    );
    let anyData = false;

    for (const row of notes) {
      const playedNote = row.played_note ?? row.playedNote ?? null;
      const expectedNote = row.expected_note ?? row.expectedNote ?? null;
      const reactionTime = row.reaction_time_ms ?? row.reactionTimeMs ?? null;
      if (!playedNote) continue;

      const expectedIdx = degreeToIndex(row.degree);
      const playedIdx = noteToIndex(playedNote, tonic);
      if (expectedIdx < 0 || playedIdx === null || playedIdx < 0) continue;

      let band: Band = 'same';
      if (expectedNote) {
        const parsedExpected = parseNote(expectedNote);
        const parsedPlayed = parseNote(playedNote);
        if (parsedExpected && parsedPlayed) {
          if (parsedPlayed.octave > parsedExpected.octave) band = 'above';
          else if (parsedPlayed.octave < parsedExpected.octave) band = 'below';
        }
      }

      m[playedIdx][expectedIdx][band].times.push(reactionTime);
      anyData = true;
    }

    return { matrix: m, hasAnyData: anyData };
  }, [notes, tonic]);

  const selectedStats = useMemo(() => {
    if (!selection) return null;
    const cell = matrix[selection.rowIdx][selection.colIdx];
    return computeAllStats(cell[selection.band].times);
  }, [selection, matrix]);

  if (!hasAnyData) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        Nessun dato disponibile per questa combinazione di filtri.
      </div>
    );
  }

  const handleBandClick = (rowIdx: number, colIdx: number, band: Band) => {
    if (selection?.rowIdx === rowIdx && selection?.colIdx === colIdx && selection?.band === band) {
      setSelection(null);
    } else {
      setSelection({ rowIdx, colIdx, band });
    }
  };

  return (
    <div>
      {/* Stat selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Statistica:</span>
        <div className="flex gap-1">
          {STAT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatMode(opt.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                statMode === opt.value
                  ? 'bg-slate-800 dark:bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 items-start">
        <div className="overflow-x-auto flex-shrink-0">
          <div className="inline-block min-w-fit">
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center mb-2 font-medium tracking-wide uppercase">
              Grado suonato dall'app (atteso)
            </div>
            <div className="flex">
              {/* Y-axis label */}
              <div className="flex flex-col items-end justify-center mr-1">
                <div
                  className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
                >
                  Grado suonato da te
                </div>
              </div>

              <div>
                {/* Column headers */}
                <div className="flex ml-10">
                  {DEGREES.map((d) => (
                    <div
                      key={`hdr-${d}`}
                      className="flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300"
                      style={{ width: S, height: 32 }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {DEGREES.map((rowDegree, rowIdx) => (
                  <div key={`row-${rowDegree}`} className="flex">
                    {/* Row header */}
                    <div
                      className="flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300"
                      style={{ width: 40, height: S }}
                    >
                      {rowDegree}
                    </div>
                    {/* Cells */}
                    {DEGREES.map((_, colIdx) => (
                      <CellSvg
                        key={`cell-${rowIdx}-${colIdx}`}
                        cell={matrix[rowIdx][colIdx]}
                        statMode={statMode}
                        isDiagonal={rowIdx === colIdx}
                        isSelected={selection?.rowIdx === rowIdx && selection?.colIdx === colIdx}
                        selectedBand={
                          selection?.rowIdx === rowIdx && selection?.colIdx === colIdx
                            ? selection.band
                            : null
                        }
                        onBandClick={(band) => handleBandClick(rowIdx, colIdx, band)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 w-24 text-right">0 ms</span>
                <div
                  className="h-3 w-48 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, rgb(21,128,61), rgb(202,138,4), rgb(220,38,38))',
                  }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">4000 ms</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">(grigio = nessun dato)</span>
              </div>
              <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400">
                {/* Stripe legend */}
                <div className="flex items-center gap-1.5">
                  <svg width={20} height={16} viewBox={`0 0 ${S} ${S}`}>
                    <polygon points={stripePoints} fill="#64748b" />
                  </svg>
                  <span>Diagonale — ottava corretta</span>
                </div>
                {/* Above legend */}
                <div className="flex items-center gap-1.5">
                  <svg width={20} height={16} viewBox={`0 0 ${S} ${S}`}>
                    <polygon points={abovePoints} fill="#64748b" />
                  </svg>
                  <span>Triangolo alto — ottava superiore</span>
                </div>
                {/* Below legend */}
                <div className="flex items-center gap-1.5">
                  <svg width={20} height={16} viewBox={`0 0 ${S} ${S}`}>
                    <polygon points={belowPoints} fill="#64748b" />
                  </svg>
                  <span>Triangolo basso — ottava inferiore</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selection && (
          <div className="flex-shrink-0 w-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Dettaglio selezione</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">atteso</span>
                    {DEGREES[selection.colIdx]}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">→</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">suonato</span>
                    {DEGREES[selection.rowIdx]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{BAND_LABELS[selection.band]}</p>
              </div>
              <button
                onClick={() => setSelection(null)}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedStats ? (
              <>
                <div className="mb-3">
                  <div
                    className="h-2 w-full rounded-full"
                    style={{
                      background: 'linear-gradient(to right, rgb(21,128,61), rgb(202,138,4), rgb(220,38,38))',
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    <span>0s</span><span>2s</span><span>4s+</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div
                    className="h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                    style={{ backgroundColor: reactionTimeColor(selectedStats.mean) }}
                  >
                    {fmt(selectedStats.mean)} media
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <StatRow label="Occorrenze" value={`${selectedStats.total}`} />
                  <StatRow label="Con tempo misurato" value={`${selectedStats.count}`} />
                  <StatRow label="Media" value={fmt(selectedStats.mean)} />
                  <StatRow label="Mediana" value={fmt(selectedStats.median)} />
                  <StatRow label="Minimo" value={fmt(selectedStats.min)} />
                  <StatRow label="Massimo" value={fmt(selectedStats.max)} />
                  <StatRow label="Dev. standard" value={fmt(selectedStats.stddev)} />
                </div>

                {selection.rowIdx !== selection.colIdx && (
                  <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Hai confuso <strong>{DEGREES[selection.colIdx]}</strong> con <strong>{DEGREES[selection.rowIdx]}</strong> in {selectedStats.total} {selectedStats.total === 1 ? 'occasione' : 'occasioni'}.
                    </p>
                  </div>
                )}

                {selection.rowIdx === selection.colIdx && (
                  <div className="mt-3 px-3 py-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                      Risposta corretta per <strong>{DEGREES[selection.colIdx]}</strong> in {selectedStats.total} {selectedStats.total === 1 ? 'occasione' : 'occasioni'}.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Nessun dato per questa fascia.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
