import { useMemo } from 'react';
import { NoteRow } from './ConfusionMatrix';

const DEGREE_ORDER = ['1', '2', '3', '4', '5', '6', '7', 'b7', 'b3', 'b6', 'b2', '#4'] as const;

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

// Parse note name and octave number from strings like "C4", "F#3", "Bb5"
function parseNote(noteWithOctave: string): { name: string; octave: number } | null {
  const m = noteWithOctave.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!m) return null;
  return { name: m[1], octave: parseInt(m[2], 10) };
}

// +1 = played octave above, -1 = below, 0 = same pitch class AND same octave (but wrong degree → handled by caller)
// We only classify when played note name matches expected name (same pitch class, different octave)
// or when is_correct (dist = 0 conceptually)
function octaveOffset(played: string, expected: string): number | null {
  const p = parseNote(played);
  const e = parseNote(expected);
  if (!p || !e) return null;

  const pSemi = NOTE_TO_SEMITONES[p.name];
  const eSemi = NOTE_TO_SEMITONES[e.name];
  if (pSemi === undefined || eSemi === undefined) return null;

  // Same pitch class → pure octave error
  if (pSemi === eSemi) {
    return p.octave - e.octave;
  }
  return null;
}

export interface OctaveErrorChartProps {
  notes: NoteRow[];
  tonic: string;
}

interface DegreeData {
  degree: string;
  // count per octave offset: -1, 0, +1 (we clamp anything beyond ±1 to ±1)
  countByOffset: Record<number, number>;
  total: number;
}

function segmentColor(offset: number): string {
  if (offset === 0) return 'rgb(34, 197, 94)';    // green-500
  if (offset > 0) return 'rgb(234, 88, 12)';       // orange-600
  return 'rgb(14, 165, 233)';                       // sky-500
}

export function OctaveErrorChart({ notes, tonic }: OctaveErrorChartProps) {
  const data = useMemo<DegreeData[]>(() => {
    const tonicSemitones = NOTE_TO_SEMITONES[tonic];
    if (tonicSemitones === undefined) return DEGREE_ORDER.map(d => ({ degree: d, countByOffset: {}, total: 0 }));

    const map: Record<string, Record<number, number>> = {};
    const totals: Record<string, number> = {};
    for (const d of DEGREE_ORDER) { map[d] = {}; totals[d] = 0; }

    for (const row of notes) {
      const playedNote = row.played_note ?? row.playedNote ?? null;
      const expectedNote = row.expected_note ?? row.expectedNote ?? null;
      const isCorrect = row.is_correct ?? row.isCorrect ?? false;

      if (!expectedNote) continue;

      const parsed = parseNote(expectedNote);
      if (!parsed) continue;
      const eSemi = NOTE_TO_SEMITONES[parsed.name];
      if (eSemi === undefined) continue;

      const interval = ((eSemi - tonicSemitones) % 12 + 12) % 12;
      const degree = SEMITONE_TO_DEGREE[interval];
      if (!degree || !(degree in map)) continue;

      totals[degree]++;

      if (isCorrect || !playedNote) {
        map[degree][0] = (map[degree][0] ?? 0) + 1;
        continue;
      }

      const offset = octaveOffset(playedNote, expectedNote);
      if (offset === null) {
        // Different pitch class → not an octave error, skip (not counted here)
        totals[degree]--;
        continue;
      }

      // Clamp to ±1
      const clamped = Math.max(-1, Math.min(1, offset));
      map[degree][clamped] = (map[degree][clamped] ?? 0) + 1;
    }

    return DEGREE_ORDER.map(d => ({ degree: d, countByOffset: map[d], total: totals[d] }));
  }, [notes, tonic]);

  const hasAnyData = data.some(d => d.total > 0);
  if (!hasAnyData) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nessun dato di ottava da visualizzare in questa sessione.
      </div>
    );
  }

  // Fixed Y axis: -1, 0, +1
  const yLevels = [-1, 0, 1];
  const yMax = 1; // levels go from -1 to +1

  const colWidth = 52;
  const chartWidth = DEGREE_ORDER.length * colWidth;
  const rowHeight = 48;
  const chartHeight = (yMax * 2 + 1) * rowHeight; // 3 rows total
  const yMid = (yMax + 1) * rowHeight - rowHeight / 2; // center of row 0

  // level → pixel center
  function levelToY(level: number) {
    return yMid - level * rowHeight;
  }

  const yAxisWidth = 44;

  return (
    <div className="overflow-x-auto">
      <div className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wide">
        Errori di ottava per grado (solo risposte con grado corretto)
      </div>
      <div className="flex gap-0 items-start">
        {/* Y-axis */}
        <div
          className="flex-shrink-0 relative"
          style={{ width: yAxisWidth + 'px', height: chartHeight + 'px' }}
        >
          {yLevels.map(v => (
            <div
              key={v}
              className="absolute right-2 text-[10px] font-mono leading-none"
              style={{
                top: levelToY(v) - 5 + 'px',
                color: v === 0 ? 'rgb(34 197 94)' : v > 0 ? 'rgb(234 88 12)' : 'rgb(14 165 233)',
              }}
            >
              {v === 0 ? 'ok' : v > 0 ? '+1 8va' : '-1 8vb'}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div
          className="relative flex-shrink-0"
          style={{ width: chartWidth + 'px', height: chartHeight + 'px' }}
        >
          {/* Horizontal grid lines */}
          {yLevels.map(v => (
            <div
              key={v}
              className="absolute left-0 right-0"
              style={{
                top: levelToY(v) + 'px',
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

            if (col.total === 0) {
              return (
                <div key={col.degree} className="absolute top-0" style={{ left: x + 'px', width: colWidth + 'px' }}>
                  <div
                    className="absolute"
                    style={{
                      left: segBarLeft + 'px',
                      width: segBarWidth + 'px',
                      top: levelToY(0) - 1 + 'px',
                      height: '2px',
                      background: 'repeating-linear-gradient(90deg, rgb(203 213 225) 0px, rgb(203 213 225) 4px, transparent 4px, transparent 8px)',
                      zIndex: 2,
                    }}
                  />
                </div>
              );
            }

            return (
              <div
                key={col.degree}
                className="absolute top-0"
                style={{ left: x + 'px', width: colWidth + 'px', height: chartHeight + 'px' }}
              >
                {Object.entries(col.countByOffset).map(([offsetStr, count]) => {
                  const offset = parseInt(offsetStr, 10);
                  const fraction = count / col.total;
                  const thickness = fraction * rowHeight;
                  const cy = levelToY(offset);

                  return (
                    <div
                      key={offset}
                      className="absolute rounded-sm"
                      style={{
                        left: segBarLeft + 'px',
                        width: segBarWidth + 'px',
                        top: cy - thickness / 2 + 'px',
                        height: Math.max(2, thickness) + 'px',
                        backgroundColor: segmentColor(offset),
                        zIndex: offset === 0 ? 3 : 4,
                        opacity: offset === 0 ? 0.75 : 0.9,
                      }}
                      title={`${col.degree}: ${offset === 0 ? 'ottava corretta' : offset > 0 ? 'ottava sopra' : 'ottava sotto'} — ${count}/${col.total} (${Math.round(fraction * 100)}%)`}
                    />
                  );
                })}
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
            <span>Ottava corretta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-2 rounded-sm bg-orange-600 opacity-90" />
            <span>Ottava sopra (+1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-2 rounded-sm bg-sky-500 opacity-90" />
            <span>Ottava sotto (-1)</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2 max-w-md mx-auto">
          Conteggiati solo i tentativi dove il grado era corretto ma l'ottava sbagliata. Le risposte con grado errato non appaiono qui.
        </p>
      </div>
    </div>
  );
}
