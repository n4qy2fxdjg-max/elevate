interface ProgressRingProps {
  size?: number
  strokeWidth?: number
  progress: number
  total: number
  color?: string
  trackColor?: string
  children?: React.ReactNode
}

export default function ProgressRing({
  size = 160,
  strokeWidth = 6,
  progress,
  total,
  color = '#F2C4B0',
  trackColor = '#E8D8C4',
  children,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, progress / total) : 1
  const dash = circumference * pct
  const gap = circumference - dash

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
