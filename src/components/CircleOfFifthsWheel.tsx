import { useRef, useState, useCallback, useEffect } from 'react';
import { Tonic } from '../types';

interface CircleOfFifthsWheelProps {
  tonic: Tonic;
  onChange: (tonic: Tonic) => void;
  label?: string;
}

// Color ramp aligned with the app's palette:
// Sharp side (0-6): warm amber/gold tones (matching app accent)
// Flat side (7-11): cool slate/sky tones (matching app dark mode)
const SHARP_COLORS = [
  '#f59e0b', // C  — amber-500
  '#f59e0b', // G
  '#f59e0b', // D
  '#f59e0b', // A
  '#ea580c', // E  — orange-600
  '#d97706', // B  — amber-600
  '#b45309', // F# — amber-700
];
const FLAT_COLORS = [
  '#b45309', // C# (transition)
  '#64748b', // Ab  — slate-500
  '#64748b', // Eb
  '#0ea5e9', // Bb  — sky-500
  '#0284c7', // F   — sky-600
];

// 12 notes in circle-of-fifths order (C at top, clockwise)
const WHEEL_NOTES: { default: Tonic; alt?: Tonic; color: string }[] = [
  { default: 'C', color: SHARP_COLORS[0] },
  { default: 'G', color: SHARP_COLORS[1] },
  { default: 'D', color: SHARP_COLORS[2] },
  { default: 'A', color: SHARP_COLORS[3] },
  { default: 'E', color: SHARP_COLORS[4] },
  { default: 'B', alt: 'Cb', color: SHARP_COLORS[5] },
  { default: 'F#', alt: 'Gb', color: SHARP_COLORS[6] },
  { default: 'C#', alt: 'Db', color: FLAT_COLORS[0] },
  { default: 'Ab', color: FLAT_COLORS[1] },
  { default: 'Eb', color: FLAT_COLORS[2] },
  { default: 'Bb', color: FLAT_COLORS[3] },
  { default: 'F', color: FLAT_COLORS[4] },
];

// 12 fixed degree slots — these do NOT rotate
// Ordered clockwise from top: 1, 5, 2, 6, 3, 7, #4, b2, b6, b3, b7, 4
const FIXED_DEGREES: { label: string; diatonic: boolean; color: string }[] = [
  { label: '1', diatonic: true, color: SHARP_COLORS[0] },
  { label: '5', diatonic: true, color: SHARP_COLORS[1] },
  { label: '2', diatonic: true, color: SHARP_COLORS[2] },
  { label: '6', diatonic: true, color: SHARP_COLORS[3] },
  { label: '3', diatonic: true, color: SHARP_COLORS[4] },
  { label: '7', diatonic: true, color: SHARP_COLORS[5] },
  { label: '#4', diatonic: false, color: SHARP_COLORS[6] },
  { label: 'b2', diatonic: false, color: FLAT_COLORS[0] },
  { label: 'b6', diatonic: false, color: FLAT_COLORS[1] },
  { label: 'b3', diatonic: false, color: FLAT_COLORS[2] },
  { label: 'b7', diatonic: false, color: FLAT_COLORS[3] },
  { label: '4', diatonic: true, color: FLAT_COLORS[4] },
];

const ANGLE_PER_STEP = 30;

function tonicToRotation(tonic: Tonic): number {
  const idx = WHEEL_NOTES.findIndex(
    (p) => p.default === tonic || p.alt === tonic
  );
  return idx >= 0 ? -idx * ANGLE_PER_STEP : 0;
}

function rotationToTonicIndex(rotation: number): number {
  const step = Math.round(rotation / ANGLE_PER_STEP);
  return ((-step % 12) + 12) % 12;
}

export function CircleOfFifthsWheel({ tonic, onChange, label }: CircleOfFifthsWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(tonicToRotation(tonic));
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNoteIdx, setHoveredNoteIdx] = useState<number | null>(null);
  const dragState = useRef({
    startPointerAngle: 0,
    startRotation: 0,
    totalMove: 0,
    active: false,
  });
  const animFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setRotation(tonicToRotation(tonic));
    }
  }, [tonic, isDragging]);

  const getPointerAngle = useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (animFrame.current) {
      cancelAnimationFrame(animFrame.current);
      animFrame.current = null;
    }
    setIsDragging(false);
    dragState.current = {
      startPointerAngle: getPointerAngle(e.clientX, e.clientY),
      startRotation: rotation,
      totalMove: 0,
      active: true,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [rotation, getPointerAngle]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.active) return;
    const currentAngle = getPointerAngle(e.clientX, e.clientY);
    let delta = ((currentAngle - dragState.current.startPointerAngle + 540) % 360) - 180;
    dragState.current.totalMove += Math.abs(delta);

    if (dragState.current.totalMove > 3) {
      setIsDragging(true);
      const newRotation = dragState.current.startRotation + delta;
      setRotation(newRotation);

      const idx = rotationToTonicIndex(newRotation);
      const pos = WHEEL_NOTES[idx];
      if (pos.default !== tonic && pos.alt !== tonic) {
        onChange(pos.default);
      }
    }
  }, [tonic, onChange, getPointerAngle]);

  const animateToSnap = useCallback((targetRotation: number) => {
    const start = rotation;
    let delta = ((targetRotation - start + 540) % 360) - 180;
    const finalRotation = start + delta;
    const startTime = performance.now();
    const duration = 280;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setRotation(start + delta * ease);

      if (t < 1) {
        animFrame.current = requestAnimationFrame(step);
      } else {
        const snapped = Math.round(finalRotation / ANGLE_PER_STEP) * ANGLE_PER_STEP;
        setRotation(snapped);
        const idx = rotationToTonicIndex(snapped);
        onChange(WHEEL_NOTES[idx].default);
        animFrame.current = null;
        setIsDragging(false);
      }
    };
    animFrame.current = requestAnimationFrame(step);
  }, [rotation, onChange]);

  const handlePointerUp = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;

    if (isDragging) {
      const snapped = Math.round(rotation / ANGLE_PER_STEP) * ANGLE_PER_STEP;
      animateToSnap(snapped);
    }
  }, [isDragging, rotation, animateToSnap]);

  const topNoteIdx = rotationToTonicIndex(rotation);
  const currentPos = WHEEL_NOTES[topNoteIdx];
  const hasAlt = currentPos.alt !== undefined;
  const usingAlt = hasAlt && tonic === currentPos.alt;

  const polarToCartesian = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
  };

  // Geometry — wider wheel
  const degreeRadius = 112;
  const degreeNodeR = 22;
  const noteRadius = 172;
  const svgHalf = 230;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative">
        {/* Radial glow background */}
        <div
          className="absolute inset-0 rounded-full opacity-50 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(245,158,11,0.1) 0%, transparent 60%)',
          }}
        />
        <svg
          ref={svgRef}
          viewBox={`-${svgHalf} -${svgHalf} ${svgHalf * 2} ${svgHalf * 2}`}
          className="relative w-88 h-88 sm:w-[420px] sm:h-[420px] touch-none cursor-grab active:cursor-grabbing"
          style={{ width: '22rem', height: '22rem' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <filter id="deg-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer dashed track */}
          <circle
            r={noteRadius + 18}
            fill="none"
            stroke="rgba(148, 163, 184, 0.12)"
            strokeWidth={1}
            strokeDasharray="2 6"
          />

          {/* Inner ring */}
          <circle
            r={degreeRadius}
            fill="none"
            stroke="rgba(245, 158, 11, 0.15)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />

          {/* Top indicator: gold chevron */}
          <g filter="url(#deg-glow)">
            <path
              d={`M 0 -${svgHalf - 6} L -10 -${svgHalf - 20} L 10 -${svgHalf - 20} Z`}
              fill="#f59e0b"
            />
          </g>

          {/* === FIXED DEGREE NODES (inner circle, do not rotate) === */}
          {FIXED_DEGREES.map((deg, i) => {
            const angle = i * ANGLE_PER_STEP;
            const pt = polarToCartesian(angle, degreeRadius);
            const isTonic = i === 0;
            const r = isTonic ? degreeNodeR + 3 : degreeNodeR;

            return (
              <g key={`deg-${i}`} transform={`translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`}>
                <circle r={r + 1.5} fill="#0f172a" />

                <circle
                  r={r}
                  fill={deg.diatonic ? deg.color : 'rgba(15, 23, 42, 0.9)'}
                  stroke={isTonic ? '#f59e0b' : deg.color}
                  strokeWidth={isTonic ? 3 : deg.diatonic ? 2.2 : 1.8}
                  strokeDasharray={deg.diatonic ? undefined : '4 2.5'}
                  style={isTonic ? { filter: `drop-shadow(0 0 8px ${deg.color}88)` } : undefined}
                />

                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isTonic ? 17 : deg.label.length > 2 ? 12 : 14}
                  fontWeight={800}
                  fill={deg.diatonic ? '#0f172a' : deg.color}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {deg.label}
                </text>
              </g>
            );
          })}

          {/* === ROTATING NOTE LABELS (outer, rotate with wheel) === */}
          {WHEEL_NOTES.map((pos, i) => {
            const angle = i * ANGLE_PER_STEP + rotation;
            const pt = polarToCartesian(angle, noteRadius);
            const isActive = i === topNoteIdx;
            const isHovered = hoveredNoteIdx === i;
            const displayNote = pos.alt && tonic === pos.alt ? pos.alt : pos.default;

            return (
              <g
                key={`note-${i}`}
                transform={`translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`}
                onPointerEnter={() => setHoveredNoteIdx(i)}
                onPointerLeave={() => setHoveredNoteIdx(null)}
              >
                {isActive && (
                  <rect
                    x={-30}
                    y={-17}
                    width={60}
                    height={34}
                    rx={11}
                    fill={pos.color}
                    opacity={0.12}
                    filter="url(#deg-glow)"
                  />
                )}

                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isActive ? 19 : isHovered ? 17 : 16}
                  fontWeight={isActive ? 800 : 700}
                  fill={isActive ? pos.color : isHovered ? pos.color : 'rgba(148, 163, 184, 0.85)'}
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    filter: isActive ? `drop-shadow(0 0 6px ${pos.color}55)` : undefined,
                    transition: 'font-size 0.15s ease, fill 0.15s ease',
                  }}
                >
                  {displayNote}
                </text>

                {pos.alt && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={17}
                    fontSize={9}
                    fontWeight={600}
                    fill={isActive ? 'rgba(245, 158, 11, 0.65)' : 'rgba(148, 163, 184, 0.4)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {pos.alt}
                  </text>
                )}
              </g>
            );
          })}

          {/* === CENTER HUD === */}
          <circle r={75} fill="rgba(15, 23, 42, 0.65)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <circle r={75} fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth={1} strokeDasharray="2 5" />

          {label && (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={-16}
              fontSize={9}
              fontWeight={700}
              fill="rgba(148, 163, 184, 0.6)"
              style={{ pointerEvents: 'none', letterSpacing: '0.14em' }}
            >
              {label.toUpperCase()}
            </text>
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            y={8}
            fontSize={30}
            fontWeight={800}
            fill="#f59e0b"
            style={{ pointerEvents: 'none', letterSpacing: '0.02em' }}
          >
            {tonic}
          </text>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            y={30}
            fontSize={10}
            fontWeight={600}
            fill="rgba(148, 163, 184, 0.45)"
            style={{ pointerEvents: 'none' }}
          >
            1°
          </text>
        </svg>
      </div>

      {/* Enharmonic toggle */}
      {hasAlt && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(currentPos.default!)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              !usingAlt
                ? 'text-white shadow-lg scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:scale-105'
            }`}
            style={
              !usingAlt
                ? { background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(245,158,11,0.15))', border: '1px solid rgba(245,158,11,0.5)' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {currentPos.default}
          </button>
          <span className="text-slate-400 text-xs font-bold">≡</span>
          <button
            onClick={() => onChange(currentPos.alt!)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              usingAlt
                ? 'text-white shadow-lg scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:scale-105'
            }`}
            style={
              usingAlt
                ? { background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(245,158,11,0.15))', border: '1px solid rgba(245,158,11,0.5)' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {currentPos.alt}
          </button>
        </div>
      )}
    </div>
  );
}
