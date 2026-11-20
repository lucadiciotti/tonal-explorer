import { useRef, useState, useCallback, useEffect } from 'react';
import { Tonic } from '../types';

interface CircleOfFifthsWheelProps {
  tonic: Tonic;
  onChange: (tonic: Tonic) => void;
  label?: string;
}

// 12 positions clockwise from C at top (circle of fifths order)
const WHEEL_POSITIONS: { default: Tonic; alt?: Tonic }[] = [
  { default: 'C' },
  { default: 'G' },
  { default: 'D' },
  { default: 'A' },
  { default: 'E' },
  { default: 'B', alt: 'Cb' },
  { default: 'F#', alt: 'Gb' },
  { default: 'C#', alt: 'Db' },
  { default: 'Ab' },
  { default: 'Eb' },
  { default: 'Bb' },
  { default: 'F' },
];

const ANGLE_PER_STEP = 30;

function tonicToRotation(tonic: Tonic): number {
  const idx = WHEEL_POSITIONS.findIndex(
    (p) => p.default === tonic || p.alt === tonic
  );
  return idx >= 0 ? -idx * ANGLE_PER_STEP : 0;
}

function rotationToTonic(rotation: number): { default: Tonic; alt?: Tonic } {
  const step = Math.round(rotation / ANGLE_PER_STEP);
  const idx = ((-step % 12) + 12) % 12;
  return WHEEL_POSITIONS[idx];
}

export function CircleOfFifthsWheel({ tonic, onChange, label }: CircleOfFifthsWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(tonicToRotation(tonic));
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startPointerAngle: 0,
    startRotation: 0,
    totalMove: 0,
  });
  const animFrame = useRef<number | null>(null);

  // Sync rotation when tonic changes externally
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
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [rotation, getPointerAngle]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragState.current.startPointerAngle === undefined) return;
    const currentAngle = getPointerAngle(e.clientX, e.clientY);
    let delta = ((currentAngle - dragState.current.startPointerAngle + 540) % 360) - 180;
    dragState.current.totalMove += Math.abs(delta);

    if (dragState.current.totalMove > 3) {
      setIsDragging(true);
      const newRotation = dragState.current.startRotation + delta;
      setRotation(newRotation);

      // Update tonic live as we cross snap points
      const pos = rotationToTonic(newRotation);
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
        const pos = rotationToTonic(snapped);
        onChange(pos.default);
        animFrame.current = null;
        setIsDragging(false);
      }
    };
    animFrame.current = requestAnimationFrame(step);
  }, [rotation, onChange]);

  const handlePointerUp = useCallback(() => {
    if (dragState.current.startPointerAngle === undefined) return;
    dragState.current.startPointerAngle = undefined as unknown as number;

    if (isDragging) {
      const snapped = Math.round(rotation / ANGLE_PER_STEP) * ANGLE_PER_STEP;
      animateToSnap(snapped);
    }
  }, [isDragging, rotation, animateToSnap]);

  // Enharmonic switch buttons for positions with alt spelling
  const currentPos = rotationToTonic(rotation);
  const hasAlt = currentPos.alt !== undefined;
  const usingAlt = hasAlt && tonic === currentPos.alt;

  const polarToCartesian = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
  };

  const radius = 140;
  const noteRadius = 26;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <svg
        ref={svgRef}
        viewBox="-185 -185 370 370"
        className="w-72 h-72 sm:w-80 sm:h-80 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Outer track circle */}
        <circle
          r={radius + 18}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-700"
          strokeWidth={1.5}
          strokeDasharray="3 6"
        />

        {/* Arc segments between positions */}
        {WHEEL_POSITIONS.map((_, i) => {
          const a1 = i * ANGLE_PER_STEP;
          const a2 = (i + 1) * ANGLE_PER_STEP;
          const p1 = polarToCartesian(a1 + rotation, radius);
          const p2 = polarToCartesian(a2 + rotation, radius);
          const isSharpSide = i < 7;
          return (
            <path
              key={i}
              d={`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`}
              fill="none"
              stroke={isSharpSide ? 'rgb(168 162 158)' : 'rgb(148 163 184)'}
              strokeWidth={2}
              opacity={0.4}
              className="transition-opacity"
            />
          );
        })}

        {/* Top indicator marker */}
        <g>
          <path
            d="M 0 -178 L -9 -167 L 9 -167 Z"
            fill="currentColor"
            className="text-amber-500 dark:text-amber-400"
          />
        </g>

        {/* Note labels */}
        {WHEEL_POSITIONS.map((pos, i) => {
          const angle = i * ANGLE_PER_STEP + rotation;
          const pt = polarToCartesian(angle, radius);
          const isTop = i === Math.round(-rotation / ANGLE_PER_STEP) % 12;
          const topIdx = ((Math.round(-rotation / ANGLE_PER_STEP) % 12) + 12) % 12;
          const isActive = i === topIdx;
          const displayNote = pos.alt && tonic === pos.alt ? pos.alt : pos.default;

          return (
            <g
              key={i}
              transform={`translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`}
            >
              <circle
                r={isActive ? noteRadius + 3 : noteRadius}
                fill={isActive ? 'currentColor' : 'transparent'}
                className={
                  isActive
                    ? 'text-slate-800 dark:text-sky-600'
                    : 'text-slate-100 dark:text-slate-800'
                }
                stroke="currentColor"
                strokeWidth={isActive ? 0 : 1.5}
              />
              <circle
                r={isActive ? noteRadius + 3 : noteRadius}
                fill="none"
                stroke={isActive ? 'currentColor' : 'transparent'}
                className={isActive ? 'text-amber-500 dark:text-amber-400' : ''}
                strokeWidth={isActive ? 2.5 : 0}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isActive ? 15 : 13}
                fontWeight={isActive ? 700 : 600}
                fill={isActive ? 'white' : 'currentColor'}
                className={isActive ? '' : 'text-slate-600 dark:text-slate-300'}
              >
                {displayNote}
              </text>
              {pos.alt && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  y={noteRadius + 12}
                  fontSize={9}
                  fontWeight={500}
                  fill="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                  opacity={isActive ? 0.8 : 0.5}
                >
                  {pos.alt}
                </text>
              )}
            </g>
          );
        })}

        {/* Center: label + selected tonic */}
        {label && (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            y={-8}
            fontSize={11}
            fill="currentColor"
            className="text-slate-400 dark:text-slate-500"
          >
            {label}
          </text>
        )}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          y={14}
          fontSize={22}
          fontWeight={700}
          fill="currentColor"
          className="text-slate-800 dark:text-slate-100"
        >
          {tonic}
        </text>
      </svg>

      {/* Enharmonic toggle */}
      {hasAlt && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(currentPos.default!)}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
              !usingAlt
                ? 'bg-slate-800 dark:bg-sky-600 text-white shadow-md scale-105'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105'
            }`}
          >
            {currentPos.default}
          </button>
          <span className="text-slate-400 text-xs">≡</span>
          <button
            onClick={() => onChange(currentPos.alt!)}
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
              usingAlt
                ? 'bg-slate-800 dark:bg-sky-600 text-white shadow-md scale-105'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105'
            }`}
          >
            {currentPos.alt}
          </button>
        </div>
      )}
    </div>
  );
}
