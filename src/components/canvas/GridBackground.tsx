interface GridBackgroundProps {
  size?: number;
}

export function GridBackground({ size = 20 }: GridBackgroundProps) {
  return (
    <defs>
      <pattern id="grid" width={size} height={size} patternUnits="userSpaceOnUse">
        <path
          d={`M ${size} 0 L 0 0 0 ${size}`}
          fill="none"
          stroke="var(--color-grid)"
          strokeWidth={0.5}
        />
      </pattern>
    </defs>
  );
}
