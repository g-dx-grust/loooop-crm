import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// BarChart
// ---------------------------------------------------------------------------

export interface BarChartDataPoint {
  label: string;
  value: number;
  isCurrentMonth?: boolean;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  className?: string;
}

const BRAND_PRIMARY = '#3370FF';
const GRID_COLOR = '#E5E6EB';
const TEXT_TERTIARY = '#86909C';

export function BarChart({
  data,
  height = 160,
  formatValue = (v) => String(v),
  className,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-xs text-text-tertiary', className)}
        style={{ height }}
      >
        データなし
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Layout constants
  const paddingTop = 20;    // space above bars for value labels
  const paddingBottom = 24; // space below bars for x-axis labels
  const paddingLeft = 0;
  const paddingRight = 0;
  const viewBoxWidth = 400;
  const viewBoxHeight = height;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;
  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;

  const barWidth = chartWidth / data.length;
  const barInnerPadding = barWidth * 0.3;
  const barRectWidth = barWidth - barInnerPadding;

  // 3 grid lines at 25%, 50%, 75% of max
  const gridLines = [0.25, 0.5, 0.75, 1.0].map((pct) => ({
    y: paddingTop + chartHeight * (1 - pct),
    value: Math.round(maxValue * pct),
  }));

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width="100%"
      height={height}
      className={className}
      role="img"
      aria-label="棒グラフ"
    >
      {/* Grid lines */}
      {gridLines.map((gl) => (
        <line
          key={gl.y}
          x1={paddingLeft}
          y1={gl.y}
          x2={viewBoxWidth - paddingRight}
          y2={gl.y}
          stroke={GRID_COLOR}
          strokeWidth="1"
        />
      ))}

      {/* Bars + labels */}
      {data.map((d, i) => {
        const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0;
        const x = paddingLeft + i * barWidth + barInnerPadding / 2;
        const barY = paddingTop + chartHeight - barHeight;
        const centerX = x + barRectWidth / 2;
        const opacity = d.isCurrentMonth ? 1 : 0.4;

        return (
          <g key={i}>
            {/* Bar rectangle */}
            <rect
              x={x}
              y={barY}
              width={barRectWidth}
              height={barHeight > 0 ? barHeight : 0}
              fill={BRAND_PRIMARY}
              fillOpacity={opacity}
              rx="2"
            />

            {/* Value label on top of bar */}
            {d.value > 0 ? (
              <text
                x={centerX}
                y={barY - 4}
                textAnchor="middle"
                fontSize="10"
                fill={TEXT_TERTIARY}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(d.value)}
              </text>
            ) : null}

            {/* X-axis label */}
            <text
              x={centerX}
              y={viewBoxHeight - 4}
              textAnchor="middle"
              fontSize="10"
              fill={d.isCurrentMonth ? BRAND_PRIMARY : TEXT_TERTIARY}
              fontWeight={d.isCurrentMonth ? '600' : '400'}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// MonthPicker — client component to navigate months via URL
// ---------------------------------------------------------------------------

interface MonthPickerProps {
  currentMonth: string;  // 'YYYY-MM'
  months: string[];      // selectable months, newest first
}

export function MonthPicker({ currentMonth, months }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-1">
      {months.map((ym) => {
        const [year, month] = ym.split('-');
        const label = `${year}年${parseInt(month ?? '1', 10)}月`;
        const isActive = ym === currentMonth;
        return (
          <a
            key={ym}
            href={`?month=${ym}`}
            className={cn(
              'rounded px-2.5 py-1 text-xs transition-colors',
              isActive
                ? 'bg-brand-primarySoft text-brand-primary font-semibold'
                : 'text-text-secondary hover:bg-bg-subtle',
            )}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
