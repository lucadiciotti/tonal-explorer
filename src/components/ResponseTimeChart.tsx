import { useMemo } from 'react';
import { NoteRow } from './ConfusionMatrix';

const DEGREE_ORDER = ['1', '2', '3', '4', '5', '6', '7', 'b7', 'b3', 'b6', 'b2', '#4'] as const;

const NOTE_TO_SEMITONES: Record<string, number> = {
  C: 0, 'B#': 0, 'Dbb': 0,
  'C#': 1, 'Db': 1,
  D: 2,
  'D#': 3, 'Eb': 3,
  E: 4, 'Fb': 4,
  F: 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  G: 7,
  'G#': 8, 'Ab': 8,
  A: 9,
  'A#': 10, 'Bb': 10,
  B: 11, 'Cb': 11,
};

const SEMITONE_TO_DEGREE: Record<number, string> = {
  0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7',
  10: 'b7', 3: 'b3', 8: 'b6', 1: 'b2', 6: '#4',
};

function parseNoteName(n: string): string | null {
  const m = n.match(/^([A-Ga-g][#b]?)/);
  return m ? m[1] : null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

interface CandleStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
}

interface DegreeCandle {
  degree: string;
  stats: CandleStats | null;
}

export interface ResponseTimeChartProps {
  notes: NoteRow[];
  tonic: string;
  correctOnly: boolean;
}

export function ResponseTimeChart({ notes, tonic, correctOnly }: ResponseTimeChartProps) {
  const data = useMemo<DegreeCandle[]>(() => {
    const tonicSemitones = NOTE_TO_SEMITONES[tonic];
    if (tonicSemitones === undefined) return DEGREE_ORDER.map(d => ({ degree: d, stats: null }));

    const timesByDegree: Record<string, number[]> = {};
    for (const d of DEGREE_ORDER) timesByDegree[d] = [];

    for (const row of notes) {
      const isCorrect = row.is_correct ?? row.isCorrect ?? false;
      if (isCorrect !== correctOnly) continue;

      const rt = row.reaction_time_ms ?? row.reactionTimeMs ?? null;
      if (rt == null || rt <= 0) continue;

      const expectedNote = row.expected_note ?? row.expectedNote ?? null;
      if (!expectedNote) continue;

      const expectedName = parseNoteName(expectedNote);
      if (!expectedName) continue;

      const expSemitones = NOTE_TO_SEMITONES[expectedName];
      if (expSemitones === undefined) continue;

      const interval = ((expSemitones - tonicSemitones) % 12 + 12) % 12;
      const degree = SEMITONE_TO_DEGREE[interval];
      if (!degree || !(degree in timesByDegree)) continue;

      timesByDegree[degree].push(rt);
    }

    return DEGREE_ORDER.map(d => {
      const times = timesByDegree[d].slice().sort((a, b) => a - b);
      if (times.length === 0) return { degree: d, stats: null };
      return {
        degree: d,
        stats: {
          min: times[0],
          q1: percentile(times, 25),
          median: percentile(times, 50),
          q3: percentile(times, 75),
          max: times[times.length - 1],
          count: times.length,
        },
      };
    });
  }, [notes, tonic, correctOnly]);

  const hasData = data.some(d => d.stats !== null);
  if (!hasData) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Nessun dato{correctOnly ? ' corretto' : ' errato'} con tempo di risposta disponibile.
      </div>
    );
  }

  // Y axis: from 0 to a rounded max
  const allMax = data.flatMap(d => (d.stats ? [d.stats.max] : []));
  const rawMax = Math.max(...allMax);
  // Round up to nearest 500ms
  const yMaxMs = Math.ceil(rawMax / 500) * 500;

  const colWidth = 52;
  const chartWidth = DEGREE_ORDER.length * colWidth;
  const chartHeight = 220;
  const yAxisWidth = 40;

  // ms → pixel (y=0 at bottom, so invert)
  function msToY(ms: number) {
    return chartHeight - (ms / yMaxMs) * chartHeight;
  }

  // Y ticks every 500ms
  const yTicks: number[] = [];
  for (let t = 0; t <= yMaxMs; t += 500) yTicks.push(t);

  const color = correctOnly ? 'rgb(34, 197, 94)' : 'rgb(234, 88, 12)';
  const colorLight = correctOnly ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 88, 12, 0.2)';
  const colorMid = correctOnly ? 'rgba(34, 197, 94, 0.6)' : 'rgba(234, 88, 12, 0.6)';

  return (
    <div className="overflow-x-auto">
      <div className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wide">
        Tempi di risposta per grado —{' '}
        <span style={{ color }}>{correctOnly ? 'risposte corrette' : 'risposte errate'}</span>
      </div>
      <div className="flex gap-0 items-start">
        {/* Y-axis */}
        <div
          className="flex-shrink-0 relative"
          style={{ width: yAxisWidth + 'px', height: chartHeight + 'px' }}
        >
          {yTicks.map(t => (
            <div
              key={t}
              className="absolute right-2 text-[10px] text-slate-400 font-mono"
              style={{ top: msToY(t) - 6 + 'px', lineHeight: '12px' }}
            >
              {t === 0 ? '0' : t >= 1000 ? `${t / 1000}s` : `${t}`}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div
          className="relative flex-shrink-0"
          style={{ width: chartWidth + 'px', height: chartHeight + 'px' }}
        >
          {/* Horizontal grid lines */}
          {yTicks.map(t => (
            <div
              key={t}
              className="absolute left-0 right-0"
              style={{
                top: msToY(t) + 'px',
                height: '1px',
                backgroundColor: t === 0 ? 'rgb(100 116 139)' : 'rgb(226 232 240)',
                zIndex: 1,
              }}
            />
          ))}

          {/* Candles */}
          {data.map((col, ci) => {
            const x = ci * colWidth;
            const cx = x + colWidth / 2;
            const wickX = cx - 0.5;
            const bodyLeft = x + colWidth * 0.25;
            const bodyWidth = colWidth * 0.5;

            if (!col.stats) {
              return (
                <div key={col.degree} className="absolute top-0" style={{ left: x + 'px', width: colWidth + 'px' }}>
                  <div
                    className="absolute"
                    style={{
                      left: bodyLeft - x + 'px',
                      width: bodyWidth + 'px',
                      top: msToY(0) - 1 + 'px',
                      height: '2px',
                      background: 'repeating-linear-gradient(90deg, rgb(203 213 225) 0px, rgb(203 213 225) 4px, transparent 4px, transparent 8px)',
                      zIndex: 2,
                    }}
                  />
                </div>
              );
            }

            const { min, q1, median, q3, max } = col.stats;
            const yMin = msToY(min);
            const yQ1 = msToY(q1);
            const yMedian = msToY(median);
            const yQ3 = msToY(q3);
            const yMax = msToY(max);

            return (
              <div
                key={col.degree}
                className="absolute top-0"
                style={{ left: x + 'px', width: colWidth + 'px', height: chartHeight + 'px' }}
              >
                {/* Wick min→max */}
                <div
                  className="absolute"
                  style={{
                    left: wickX - x + 'px',
                    width: '2px',
                    top: yMax + 'px',
                    height: yMin - yMax + 'px',
                    backgroundColor: colorMid,
                    zIndex: 2,
                  }}
                />

                {/* Box q1→q3 */}
                <div
                  className="absolute rounded-sm"
                  style={{
                    left: bodyLeft - x + 'px',
                    width: bodyWidth + 'px',
                    top: yQ3 + 'px',
                    height: Math.max(2, yQ1 - yQ3) + 'px',
                    backgroundColor: colorLight,
                    border: `1.5px solid ${colorMid}`,
                    zIndex: 3,
                  }}
                  title={`${col.degree}: min ${min}ms | Q1 ${Math.round(q1)}ms | med ${Math.round(median)}ms | Q3 ${Math.round(q3)}ms | max ${max}ms (${col.stats.count}x)`}
                />

                {/* Median line */}
                <div
                  className="absolute rounded-sm"
                  style={{
                    left: bodyLeft - x + 'px',
                    width: bodyWidth + 'px',
                    top: yMedian - 1.5 + 'px',
                    height: '3px',
                    backgroundColor: color,
                    zIndex: 4,
                  }}
                />
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
            {col.stats && (
              <span className="block text-[9px] text-slate-400 font-normal">{col.stats.count}x</span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-4 rounded" style={{ backgroundColor: colorMid }} />
          <span>Range min-max</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-3 rounded-sm border" style={{ backgroundColor: colorLight, borderColor: colorMid }} />
          <span>Q1–Q3 (50% centrale)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 rounded" style={{ backgroundColor: color }} />
          <span>Mediana</span>
        </div>
      </div>
    </div>
  );
}
