import { useEffect, useRef, useState } from 'react';
import { PitchData } from '../lib/audio/PitchDetector';

interface PitchTunerProps {
  pitchData: PitchData | null;
}

const HISTORY_LENGTH = 40;
const CENTS_RANGE = 50;
const EMA_ALPHA = 0.15;
const DEAD_ZONE = 3;
const NOTE_STABLE_FRAMES = 6;

export function PitchTuner({ pitchData }: PitchTunerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<(number | null)[]>([]);
  const [displayNote, setDisplayNote] = useState<string | null>(null);
  const smoothedCentsRef = useRef<number | null>(null);
  const stableNoteRef = useRef<string | null>(null);
  const stableOctaveRef = useRef<number | null>(null);
  const candidateNoteRef = useRef<string | null>(null);
  const candidateOctaveRef = useRef<number | null>(null);
  const candidateCountRef = useRef<number>(0);

  useEffect(() => {
    const history = historyRef.current;

    if (pitchData) {
      const noteKey = `${pitchData.note}${pitchData.octave}`;
      const stableKey = stableNoteRef.current !== null
        ? `${stableNoteRef.current}${stableOctaveRef.current}`
        : null;

      if (noteKey === stableKey || stableKey === null) {
        stableNoteRef.current = pitchData.note;
        stableOctaveRef.current = pitchData.octave;
        candidateNoteRef.current = null;
        candidateCountRef.current = 0;
      } else {
        if (noteKey === `${candidateNoteRef.current}${candidateOctaveRef.current}`) {
          candidateCountRef.current++;
        } else {
          candidateNoteRef.current = pitchData.note;
          candidateOctaveRef.current = pitchData.octave;
          candidateCountRef.current = 1;
        }
        if (candidateCountRef.current >= NOTE_STABLE_FRAMES) {
          stableNoteRef.current = pitchData.note;
          stableOctaveRef.current = pitchData.octave;
          candidateNoteRef.current = null;
          candidateCountRef.current = 0;
          smoothedCentsRef.current = null;
        }
      }

      const raw = pitchData.cents;
      const prev = smoothedCentsRef.current;
      let smoothed: number;
      if (prev === null) {
        smoothed = raw;
      } else {
        smoothed = prev + EMA_ALPHA * (raw - prev);
        if (Math.abs(smoothed - prev) < DEAD_ZONE) {
          smoothed = prev;
        }
      }
      smoothedCentsRef.current = smoothed;

      history.push(smoothed);
      setDisplayNote(`${stableNoteRef.current}${stableOctaveRef.current}`);
    } else {
      history.push(null);
      if (history.filter(v => v === null).length > HISTORY_LENGTH / 2) {
        setDisplayNote(null);
        smoothedCentsRef.current = null;
        stableNoteRef.current = null;
        stableOctaveRef.current = null;
        candidateNoteRef.current = null;
        candidateCountRef.current = 0;
      }
    }
    if (history.length > HISTORY_LENGTH) {
      history.splice(0, history.length - HISTORY_LENGTH);
    }
  }, [pitchData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frameId: number;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const history = historyRef.current;
      const isDark = document.documentElement.classList.contains('dark');

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 8);
      ctx.fill();

      const centerX = w / 2;
      const barAreaTop = 12;
      const barAreaBottom = h - 12;
      const barAreaHeight = barAreaBottom - barAreaTop;

      // Graduated scale marks
      const scaleSteps = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = '10px system-ui, sans-serif';
      for (const step of scaleSteps) {
        const x = centerX + (step / CENTS_RANGE) * (w / 2 - 40);
        if (step === 0) {
          ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
          ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.moveTo(x, barAreaTop);
        ctx.lineTo(x, barAreaBottom);
        ctx.stroke();

        if (step % 20 === 0) {
          ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
          ctx.fillText(`${step > 0 ? '+' : ''}${step}`, x, barAreaTop - 1);
        }
      }

      // Draw history bars from oldest to newest
      const barWidth = Math.max(3, (w - 80) / HISTORY_LENGTH * 0.6);
      const gap = (w - 80) / HISTORY_LENGTH;
      const startX = centerX - (HISTORY_LENGTH / 2) * gap;

      for (let i = 0; i < history.length; i++) {
        const cents = history[i];
        if (cents === null) continue;

        const age = (history.length - 1 - i) / HISTORY_LENGTH;
        const alpha = Math.max(0.08, 1 - age * 1.2);
        const clamped = Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, cents));
        const barH = Math.max(4, barAreaHeight * 0.5);
        const barY = barAreaTop + (barAreaHeight - barH) / 2;

        const absDeviation = Math.abs(clamped) / CENTS_RANGE;
        let r: number, g: number, b: number;
        if (absDeviation < 0.2) {
          // Green zone: in tune
          r = 34; g = 197; b = 94;
        } else if (absDeviation < 0.5) {
          // Yellow zone: slightly off
          const t = (absDeviation - 0.2) / 0.3;
          r = Math.round(34 + t * (234 - 34));
          g = Math.round(197 + t * (179 - 197));
          b = Math.round(94 + t * (8 - 94));
        } else {
          // Red zone: very off
          const t = Math.min(1, (absDeviation - 0.5) / 0.5);
          r = Math.round(234 + t * (239 - 234));
          g = Math.round(179 - t * (111));
          b = Math.round(8 + t * (60));
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        const xPos = centerX + (clamped / CENTS_RANGE) * (w / 2 - 40);
        ctx.beginPath();
        ctx.roundRect(xPos - barWidth / 2, barY, barWidth, barH, 2);
        ctx.fill();
      }

      // Current indicator (larger, brighter)
      const current = history.length > 0 ? history[history.length - 1] : null;
      if (current !== null && current !== undefined) {
        const clamped = Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, current));
        const xPos = centerX + (clamped / CENTS_RANGE) * (w / 2 - 40);
        const indicatorH = barAreaHeight * 0.7;
        const indicatorY = barAreaTop + (barAreaHeight - indicatorH) / 2;
        const indicatorW = barWidth * 2;

        const absDeviation = Math.abs(clamped) / CENTS_RANGE;
        let color: string;
        if (absDeviation < 0.2) {
          color = '#22c55e';
        } else if (absDeviation < 0.5) {
          color = '#eab308';
        } else {
          color = '#ef4444';
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(xPos - indicatorW / 2, indicatorY, indicatorW, indicatorH, 3);
        ctx.fill();

        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(xPos - indicatorW / 2, indicatorY, indicatorW, indicatorH, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Center target line (on top of everything)
      ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(centerX, barAreaTop);
      ctx.lineTo(centerX, barAreaBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto mt-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">Intonazione</span>
        {displayNote && (
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 font-mono">{displayNote}</span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ height: 80 }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-400 dark:text-slate-500">calante</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">crescente</span>
      </div>
    </div>
  );
}
