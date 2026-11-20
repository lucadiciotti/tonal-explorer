import { useRef, useState, useCallback, useEffect } from 'react';
import { Tonic } from '../types';

interface CircleOfFifthsWheelProps {
  tonic: Tonic;
  onChange: (tonic: Tonic) => void;
  label?: string;
}

// 12 notes in circle-of-fifths order (C at top, clockwise)
const WHEEL_NOTES: { default: Tonic; alt?: Tonic; color: string }[] = [
  { default: 'C', color: '#e69d4d' },
  { default: 'G', color: '#d89964' },
  { default: 'D', color: '#ea9c4b' },
  { default: 'A', color: '#ee9d46' },
  { default: 'E', color: '#df9652' },
  { default: 'B', alt: 'Cb', color: '#c28d6c' },
  { default: 'F#', alt: 'Gb', color: '#9f8394' },
  { default: 'C#', alt: 'Db', color: '#797db6' },
  { default: 'Ab', color: '#5a84d6' },
  { default: 'Eb', color: '#4c8ce4' },
  { default: 'Bb', color: '#5d8ad5' },
  { default: 'F', color: '#878eb4' },
];

// 12 fixed degree slots — these do NOT rotate
// Ordered clockwise from top: 1, 5, 2, 6, 3, 7, #4/b5, b2, b6, b3, b7, 4
const FIXED_DEGREES: { label: string; diatonic: boolean; color: string }[] = [
  { label: '1', diatonic: true, color: '#e69d4d' },
  { label: '5', diatonic: true, color: '#d89964' },
  { label: '2', diatonic: true, color: '#ea9c4b' },
  { label: '6', diatonic: true, color: '#ee9d46' },
  { label: '3', diatonic: true, color: '#df9652' },
  { label: '7', diatonic: true, color: '#c28d6c' },
  { label: '#4', diatonic: false, color: '#9f8394' },
  { label: 'b2', diatonic: false, color: '#797db6' },
  { label: 'b6', diatonic: false, color: '#5a84d6' },
  { label: 'b3', diatonic: false, color: '#4c8ce4' },
  { label: 'b7', diatonic: false, color: '#5d8ad5' },
  { label: '4', diatonic: true, color: '#878eb4' },
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

  // Geometry
  const degreeRadius = 100;   // inner circle: degree nodes
  const degreeNodeR = 20;     // degree node radius
  const noteRadius = 155;     // outer: note labels
  const svgHalf = 210;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative">
        {/* Radial glow background */}
        <div
          className="absolute inset-0 rounded-full opacity-50 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(230,157,77,0.12) 0%, transparent 60%)',
          }}
        />
        <svg
          ref={svgRef}
          viewBox={`-${svgHalf} -${svgHalf} ${svgHalf * 2} ${svgHalf * 2}`}
          className="relative w-80 h-80 sm:w-96 sm:h-96 touch-none cursor-grab active:cursor-grabbing"
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

          {/* Outer dashed track for note labels */}
          <circle
            r={noteRadius + 16}
            fill="none"
            stroke="rgba(148, 163, 184, 0.12)"
            strokeWidth={1}
            strokeDasharray="2 6"
          />

          {/* Inner ring (diatonic arc highlight) */}
          <circle
            r={degreeRadius}
            fill="none"
            stroke="rgba(230, 157, 77, 0.2)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />

          {/* Top indicator: gold chevron */}
          <g filter="url(#deg-glow)">
            <path
              d={`M 0 -${svgHalf - 8} L -10 -${svgHalf - 20} L 10 -${svgHalf - 20} Z`}
              fill="#e69d4d"
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
                {/* Background mask */}
                <circle r={r + 1.5} fill="rgb(11 21 36)" />

                {/* Outer ring */}
                <circle
                  r={r}
                  fill={deg.diatonic ? deg.color : 'rgba(15, 29, 48, 0.92)'}
                  stroke={isTonic ? '#e69d4d' : deg.color}
                  strokeWidth={isTonic ? 3 : deg.diatonic ? 2.2 : 1.8}
                  strokeDasharray={deg.diatonic ? undefined : '4 2.5'}
                  style={isTonic ? { filter: `drop-shadow(0 0 8px ${deg.color}88)` } : undefined}
                />

                {/* Degree label */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isTonic ? 16 : deg.label.length > 2 ? 11 : 13}
                  fontWeight={800}
                  fill={isTonic ? '#0b1524' : deg.diatonic ? '#0b1524' : deg.color}
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
                {/* Active note: glowing background pill */}
                {isActive && (
                  <rect
                    x={-28}
                    y={-16}
                    width={56}
                    height={32}
                    rx={10}
                    fill={pos.color}
                    opacity={0.15}
                    filter="url(#deg-glow)"
                  />
                )}

                {/* Note text */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isActive ? 18 : isHovered ? 16 : 15}
                  fontWeight={isActive ? 800 : 700}
                  fill={isActive ? pos.color : isHovered ? pos.color : 'rgba(148, 163, 184, 0.85)'}
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    filter: isActive ? `drop-shadow(0 0 6px ${pos.color}66)` : undefined,
                    transition: 'font-size 0.15s ease, fill 0.15s ease',
                  }}
                >
                  {displayNote}
                </text>

                {/* Alt spelling (small, below) */}
                {pos.alt && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={16}
                    fontSize={9}
                    fontWeight={600}
                    fill={isActive ? 'rgba(230, 157, 77, 0.7)' : 'rgba(148, 163, 184, 0.4)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {pos.alt}
                  </text>
                )}
              </g>
            );
          })}

          {/* === CENTER HUD === */}
          <circle r={68} fill="rgba(11, 21, 36, 0.7)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <circle r={68} fill="none" stroke="rgba(230,157,77,0.1)" strokeWidth={1} strokeDasharray="2 5" />

          {label && (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={-14}
              fontSize={9}
              fontWeight={700}
              fill="rgba(148, 163, 184, 0.65)"
              style={{ pointerEvents: 'none', letterSpacing: '0.14em' }}
            >
              {label.toUpperCase()}
            </text>
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            y={8}
            fontSize={28}
            fontWeight={800}
            fill="#e69d4d"
            style={{ pointerEvents: 'none', letterSpacing: '0.02em' }}
          >
            {tonic}
          </text>
          {/* Degree 1 indicator in center */}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            y={28}
            fontSize={10}
            fontWeight={600}
            fill="rgba(148, 163, 184, 0.5)"
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
                ? { background: 'linear-gradient(135deg, rgba(230,157,77,0.35), rgba(230,157,77,0.15))', border: '1px solid rgba(230,157,77,0.55)' }
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
                ? { background: 'linear-gradient(135deg, rgba(230,157,77,0.35), rgba(230,157,77,0.15))', border: '1px solid rgba(230,157,77,0.55)' }
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
