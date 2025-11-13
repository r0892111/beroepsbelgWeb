'use client';

export default function DiagonalStripes({
  className = '',
  strokeWidth = 2,
  gap = 18,
  tiltDeg = 62,
}: {
  className?: string;
  strokeWidth?: number;
  gap?: number;
  tiltDeg?: number;
}) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="stripePattern"
          width={gap}
          height={gap}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${tiltDeg})`}
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={gap}
            stroke="var(--line)"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#stripePattern)" opacity="0" />
      <g transform={`rotate(${tiltDeg} 0 0)`}>
        <line
          x1="70%"
          y1="-20%"
          x2="70%"
          y2="140%"
          stroke="var(--line)"
          strokeWidth={strokeWidth}
        />
        <line
          x1={`calc(70% + ${gap}px)`}
          y1="-20%"
          x2={`calc(70% + ${gap}px)`}
          y2="140%"
          stroke="var(--line)"
          strokeWidth={strokeWidth}
        />
        <line
          x1={`calc(70% + ${gap * 2}px)`}
          y1="-20%"
          x2={`calc(70% + ${gap * 2}px)`}
          y2="140%"
          stroke="var(--line)"
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
}
