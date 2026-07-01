import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, tooltipStyle } from './chart-theme';

export function SimpleLineChart({
  data,
  xKey,
  yKey,
  color = CHART_COLORS.info,
  height = 260,
  yFormatter,
  referenceY,
  referenceLabel,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  yFormatter?: (v: number) => string;
  referenceY?: number;
  referenceLabel?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
          width={48}
          tickFormatter={yFormatter}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [yFormatter ? yFormatter(Number(value)) : value, '']}
        />
        {referenceY !== undefined && (
          <ReferenceLine
            y={referenceY}
            stroke={CHART_COLORS.destructive}
            strokeDasharray="6 4"
            label={{
              value: referenceLabel,
              fill: CHART_COLORS.destructive,
              fontSize: 11,
              position: 'insideTopRight',
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
