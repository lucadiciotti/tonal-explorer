import { useRef, useState, useCallback, useEffect } from 'react';
import { Tonic } from '../types';

interface CircleOfFifthsWheelProps {
  tonic: Tonic;
  onChange: (tonic: Tonic) => void;
  label?: string;
}

// 12 positions clockwise from C at top (circle of fifths order)
const WHEEL_POSITIONS: { default: Tonic; alt?: Tonic; color: string }[] = [
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

const ANGLE_PER_STEP = 30;

function tonicToRotation(tonic: Tonic): number {
  const idx = WHEEL_POSITIONS.findIndex(
    (p) => p.default === tonic || p.alt === tonic
  );
  return idx >= 0 ? -idx * ANGLE_PER_STEP : 0;
}

function rotationToTonic(rotation: number): { default: Tonic; alt?: Tonic; color: string } {
  const step = Math.round(rotation / ANGLE_PER_STEP);
  const idx = ((-step % 12) + 12) % 12;
  return WHEEL_POSITIONS[idx];
}

function normAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function CircleOfFifthsWheel({ tonic, onChange, label }: CircleOfFifthsWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(tonicToRotation(tonic));
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
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
    if (!dragState.current.active) return;
    dragState.current.active = false;

    if (isDragging) {
      const snapped = Math.round(rotation / ANGLE_PER_STEP) * ANGLE_PER_STEP;
      animateToSnap(snapped);
    }
  }, [isDragging, rotation, animateToSnap]);

  const currentPos = rotationToTonic(rotation);
  const hasAlt = currentPos.alt !== undefined;
  const usingAlt = hasAlt && tonic === currentPos.alt;
  const topIdx = ((Math.round(-rotation / ANGLE_PER_STEP) % 12) + 12) % 12;

  const polarToCartesian = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
  };

  const radius = 140;
  const noteRadius = 26;

  // Unique gradient IDs for SVG defs
  const gradientId = (i: number) => `wheel-grad-${i}`;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative">
        {/* Radial glow background */}
        <div
          className="absolute inset-0 rounded-full opacity-60 dark:opacity-80 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(230,157,77,0.12) 0%, transparent 55%)',
          }}
        />
        <svg
          ref={svgRef}
          viewBox="-190 -190 380 380"
          className="relative w-72 h-72 sm:w-80 sm:h-80 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            {WHEEL_POSITIONS.map((pos, i) => {
              const next = WHEEL_POSITIONS[(i + 1) % 12];
              const a1 = i * ANGLE_PER_STEP;
              const a2 = (i + 1) * ANGLE_PER_STEP;
              const p1 = polarToCartesian(a1, radius);
              const p2 = polarToCartesian(a2, radius);
              return (
                <linearGradient
                  key={i}
                  id={gradientId(i)}
                  gradientUnits="userSpaceOnUse"
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                >
                  <stop offset="0%" stopColor={pos.color} />
                  <stop offset="100%" stopColor={next.color} />
                </linearGradient>
              );
            })}
            <filter id="wheel-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer dashed track */}
          <circle
            r={radius + 22}
            fill="none"
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth={1}
            strokeDasharray="3 7"
          />

          {/* Glow arcs */}
          <g opacity={0.35}>
            {WHEEL_POSITIONS.map((_, i) => {
              const a1 = i * ANGLE_PER_STEP + rotation;
              const a2 = (i + 1) * ANGLE_PER_STEP + rotation;
              const p1 = polarToCartesian(a1, radius);
              const p2 = polarToCartesian(a2, radius);
              return (
                <path
                  key={`glow-${i}`}
                  d={`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`}
                  fill="none"
                  stroke={`url(#${gradientId(i)})`}
                  strokeWidth={10}
                  strokeLinecap="round"
                  filter="url(#wheel-glow)"
                />
              );
            })}
          </g>

          {/* Main arcs */}
          {WHEEL_POSITIONS.map((_, i) => {
            const a1 = i * ANGLE_PER_STEP + rotation;
            const a2 = (i + 1) * ANGLE_PER_STEP + rotation;
            const p1 = polarToCartesian(a1, radius);
            const p2 = polarToCartesian(a2, radius);
            return (
              <path
                key={`arc-${i}`}
                d={`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`}
                fill="none"
                stroke={`url(#${gradientId(i)})`}
                strokeWidth={4}
                strokeLinecap="round"
              />
            );
          })}

          {/* Top indicator: elegant gold chevron + glow ring */}
          <g filter="url(#wheel-glow)">
            <path
              d="M 0 -182 L -10 -170 L 10 -170 Z"
              fill="#e69d4d"
            />
          </g>
          <circle cx={0} cy={-radius} r={noteRadius + 6} fill="none" stroke="rgba(230,157,77,0.25)" strokeWidth={1} strokeDasharray="2 4" />

          {/* Note nodes */}
          {WHEEL_POSITIONS.map((pos, i) => {
            const angle = i * ANGLE_PER_STEP + rotation;
            const pt = polarToCartesian(angle, radius);
            const isActive = i === topIdx;
            const isHovered = hoveredIdx === i;
            const displayNote = pos.alt && tonic === pos.alt ? pos.alt : pos.default;
            const r = isActive ? noteRadius + 4 : isHovered ? noteRadius + 2 : noteRadius;

            return (
              <g
                key={i}
                transform={`translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`}
                onPointerEnter={() => setHoveredIdx(i)}
                onPointerLeave={() => setHoveredIdx(null)}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {/* Background mask to hide arc behind node */}
                <circle r={r + 2} fill="rgb(11 21 36)" />

                {/* Outer ring */}
                <circle
                  r={r}
                  fill={isActive ? pos.color : 'rgba(15, 29, 48, 0.9)'}
                  stroke={isActive ? '#e69d4d' : pos.color}
                  strokeWidth={isActive ? 3 : isHovered ? 2.5 : 1.8}
                  style={isActive || isHovered ? { filter: `drop-shadow(0 0 8px ${pos.color}88)` } : undefined}
                />

                {/* Note text */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isActive ? 15 : isHovered ? 14 : 13}
                  fontWeight={isActive ? 800 : 700}
                  fill={isActive ? '#0b1524' : pos.color}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {displayNote}
                </text>

                {/* Alt spelling below */}
                {pos.alt && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={noteRadius + 13}
                    fontSize={9}
                    fontWeight={600}
                    fill="rgba(148, 163, 184, 0.6)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {pos.alt}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center hub */}
          <circle r={62} fill="rgba(11, 21, 36, 0.6)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <circle r={62} fill="none" stroke="rgba(230,157,77,0.12)" strokeWidth={1} strokeDasharray="2 5" />

          {label && (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={-12}
              fontSize={10}
              fontWeight={700}
              fill="rgba(148, 163, 184, 0.7)"
              style={{ pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.14em' }}
            >
              {label}
            </text>
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            y={14}
            fontSize={26}
            fontWeight={800}
            fill="#e69d4d"
            style={{ pointerEvents: 'none', letterSpacing: '0.02em' }}
          >
            {tonic}
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
