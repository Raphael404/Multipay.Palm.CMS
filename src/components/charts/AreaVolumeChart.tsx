import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatGEL } from '@/lib/format';
import { CHART_COLORS, tooltipStyle } from './chart-theme';

export function AreaVolumeChart({
  data,
  xKey,
  yKey = 'volume',
  height = 260,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.info} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.info} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke={CHART_COLORS.muted}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke={CHART_COLORS.muted}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => formatGEL(v, { compact: true })}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatGEL(Number(value)), 'Volume']}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={CHART_COLORS.info}
          strokeWidth={2}
          fill="url(#volumeFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
