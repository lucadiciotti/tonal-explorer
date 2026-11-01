import { useMemo } from 'react';
import { NoteRow } from './ConfusionMatrix';

const DEGREE_ORDER = ['1', '2', '3', '4', '5', '6', '7', 'b7', 'b3', 'b6', 'b2', '#4'] as const;

const NOTE_TO_FIFTHS: Record<string, number> = {
  C: 0, 'B#': 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4, 'Fb': 4,
  B: 5, 'Cb': 5,
  'F#': 6, 'Gb': 6,
  'Db': 7, 'C#': 7,
  'Ab': 8, 'G#': 8,
  'Eb': 9, 'D#': 9,
  'Bb': 10, 'A#': 10,
  F: 11, 'E#': 11,
};

const SEMITONE_TO_DEGREE: Record<number, string> = {
  0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7',
  10: 'b7', 3: 'b3', 8: 'b6', 1: 'b2', 6: '#4',
};

const NOTE_TO_SEMITONES: Record<string, number> = {
  C: 0, 'B#': 0, 'Dbb': 0,
  'C#': 1, 'Db': 1, 'B##': 1,
  D: 2, 'C##': 2, 'Ebb': 2,
  'D#': 3, 'Eb': 3, 'Fbb': 3,
  E: 4, 'D##': 4, 'Fb': 4,
  F: 5, 'E#': 5, 'Gbb': 5,
  'F#': 6, 'Gb': 6, 'E##': 6,
  G: 7, 'F##': 7, 'Abb': 7,
  'G#': 8, 'Ab': 8,
  A: 9, 'G##': 9, 'Bbb': 9,
  'A#': 10, 'Bb': 10, 'Cbb': 10,
  B: 11, 'A##': 11, 'Cb': 11,
};

function parseNoteName(noteWithOctave: string): string | null {
  const m = noteWithOctave.match(/^([A-Ga-g][#b]?)/);
  return m ? m[1] : null;
}

function fifthsDistance(playedNote: string, expectedNote: string): number | null {
  const pPos = NOTE_TO_FIFTHS[playedNote];
  const ePos = NOTE_TO_FIFTHS[expectedNote];
  if (pPos === undefined || ePos === undefined) return null;
  let d = pPos - ePos;
  if (d > 6) d -= 12;
  if (d <= -6) d += 12;
  return d;
}

export interface FifthsErrorChartProps {
  notes: NoteRow[];
  tonic: string;
}

interface DegreeData {
  degree: string;
  // counts per fifths distance (0 = correct)
  countByDist: Record<number, number>;
  total: number;
}

// Color for a given distance: 0 = green, positive = orange, negative = sky
function segmentColor(dist: number): string {
  if (dist === 0) return 'rgb(34, 197, 94)';    // green-500
  if (dist > 0) return 'rgb(234, 88, 12)';       // orange-600
  return 'rgb(14, 165, 233)';                     // sky-500
}

export function FifthsErrorChart({ notes, tonic }: FifthsErrorChartProps) {
  const data = useMemo<DegreeData[]>(() => {
    const tonicSemitones = NOTE_TO_SEMITONES[tonic];
    if (tonicSemitones === undefined) return DEGREE_ORDER.map(d => ({ degree: d, countByDist: {}, total: 0 }));

    const map: Record<string, Record<number, number>> = {};
    const totals: Record<string, number> = {};
    for (const d of DEGREE_ORDER) { map[d] = {}; totals[d] = 0; }

    for (const row of notes) {
      const playedNote = row.played_note ?? row.playedNote ?? null;
      const expectedNote = row.expected_note ?? row.expectedNote ?? null;
      const isCorrect = row.is_correct ?? row.isCorrect ?? false;

      if (!expectedNote) continue;
      const expectedName = parseNoteName(expectedNote);
      if (!expectedName) continue;

      const expSemitones = NOTE_TO_SEMITONES[expectedName];
      if (expSemitones === undefined) continue;
      const interval = ((expSemitones - tonicSemitones) % 12 + 12) % 12;
      const degree = SEMITONE_TO_DEGREE[interval];
      if (!degree || !(degree in map)) continue;

      totals[degree]++;

      if (isCorrect || !playedNote) {
        map[degree][0] = (map[degree][0] ?? 0) + 1;
        continue;
      }

      const playedName = parseNoteName(playedNote);
      if (!playedName) { map[degree][0] = (map[degree][0] ?? 0) + 1; continue; }

      const dist = fifthsDistance(playedName, expectedName);
      if (dist === null) { map[degree][0] = (map[degree][0] ?? 0) + 1; continue; }

      map[degree][dist] = (map[degree][dist] ?? 0) + 1;
    }

    return DEGREE_ORDER.map(d => ({ degree: d, countByDist: map[d], total: totals[d] }));
  }, [notes, tonic]);

  const hasAnyData = data.some(d => d.total > 0);
  if (!hasAnyData) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nessun dato da visualizzare in questa sessione.
      </div>
    );
  }

  // Y-axis range: cover all distances present
  const allDists = data.flatMap(d => Object.keys(d.countByDist).map(Number));
  const maxAbs = Math.max(1, ...allDists.map(Math.abs));
  const yMax = Math.ceil(maxAbs) + 1;

  const colWidth = 52;
  const chartWidth = DEGREE_ORDER.length * colWidth;
  const rowHeight = 32;
  const chartHeight = yMax * 2 * rowHeight;
  const yMid = yMax * rowHeight;

  const yTicks: number[] = [];
  for (let v = -yMax + 1; v < yMax; v++) yTicks.push(v);

  const yAxisWidth = 32;

  // Segment thickness: fraction of rowHeight (100% = full rowHeight, meaning band from -0.5 to +0.5)
  // A segment at distance `d` with fraction `f` is drawn centered on `yMid - d * rowHeight`
  // with height = f * rowHeight

  return (
    <div className="overflow-x-auto">
      <div className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wide">
        Distribuzione nel circolo delle quinte per grado
      </div>
      <div className="flex gap-0 items-start">
        {/* Y-axis */}
        <div className="flex-shrink-0 relative pr-2" style={{ width: yAxisWidth + 'px', height: chartHeight + 'px' }}>
          {yTicks.map(v => (
            <div
              key={v}
              className="absolute right-2 text-[10px] text-slate-400 font-mono"
              style={{ top: yMid - v * rowHeight - 6 + 'px', lineHeight: '12px' }}
            >
              {v === 0 ? '0' : v > 0 ? `+${v}` : v}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-shrink-0" style={{ width: chartWidth + 'px', height: chartHeight + 'px' }}>
          {/* Horizontal grid lines */}
          {yTicks.map(v => (
            <div
              key={v}
              className="absolute left-0 right-0"
              style={{
                top: yMid - v * rowHeight + 'px',
                height: '1px',
                backgroundColor: v === 0 ? 'rgb(100 116 139)' : 'rgb(226 232 240)',
                zIndex: v === 0 ? 2 : 1,
              }}
            />
          ))}

          {/* Columns */}
          {data.map((col, ci) => {
            const x = ci * colWidth;
            const segBarLeft = colWidth * 0.2;
            const segBarWidth = colWidth * 0.6;

            return (
              <div
                key={col.degree}
                className="absolute top-0"
                style={{ left: x + 'px', width: colWidth + 'px', height: chartHeight + 'px' }}
              >
                {col.total === 0 ? (
                  /* No data: faint dashed line at zero */
                  <div
                    className="absolute"
                    style={{
                      left: segBarLeft + 'px',
                      width: segBarWidth + 'px',
                      top: yMid - 1 + 'px',
                      height: '2px',
                      background: 'repeating-linear-gradient(90deg, rgb(203 213 225) 0px, rgb(203 213 225) 4px, transparent 4px, transparent 8px)',
                      zIndex: 3,
                    }}
                  />
                ) : (
                  Object.entries(col.countByDist).map(([distStr, count]) => {
                    const dist = parseInt(distStr, 10);
                    const fraction = count / col.total;
                    const thickness = fraction * rowHeight;
                    const cy = yMid - dist * rowHeight; // center pixel for this distance

                    return (
                      <div
                        key={dist}
                        className="absolute rounded-sm"
                        style={{
                          left: segBarLeft + 'px',
                          width: segBarWidth + 'px',
                          top: cy - thickness / 2 + 'px',
                          height: thickness + 'px',
                          backgroundColor: segmentColor(dist),
                          zIndex: dist === 0 ? 3 : 4,
                          opacity: dist === 0 ? 0.75 : 0.9,
                        }}
                        title={`${col.degree}: distanza ${dist > 0 ? '+' + dist : dist} — ${count}/${col.total} (${Math.round(fraction * 100)}%)`}
                      />
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex mt-1">
        <div style={{ width: yAxisWidth + 'px', flexShrink: 0 }} />
        {data.map(col => (
          <div
            key={col.degree}
            className="text-center text-xs font-semibold text-slate-600"
            style={{ width: colWidth + 'px', flexShrink: 0 }}
          >
            {col.degree}
            {col.total > 0 && (
              <span className="block text-[9px] text-slate-400 font-normal">{col.total}x</span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-3 rounded-sm bg-green-500 opacity-75" />
            <span>Risposta corretta (dist. 0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-2 rounded-sm bg-orange-600 opacity-90" />
            <span>Troppo acuto (circolo in avanti)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-2 rounded-sm bg-sky-500 opacity-90" />
            <span>Troppo bemolle (circolo indietro)</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2 max-w-md mx-auto">
          Lo spessore di ogni segmento è proporzionale alla percentuale di risposte in quella posizione.
          Un grado perfetto mostra un unico blocco verde centrato su 0.
        </p>
      </div>
    </div>
  );
}
