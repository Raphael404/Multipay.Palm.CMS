import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, tooltipStyle } from './chart-theme';

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  color = CHART_COLORS.info,
  height = 260,
  yFormatter,
  layout = 'horizontal',
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  yFormatter?: (v: number) => string;
  layout?: 'horizontal' | 'vertical';
}) {
  if (layout === 'vertical') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            stroke={CHART_COLORS.muted}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={yFormatter}
          />
          <YAxis
            type="category"
            dataKey={xKey}
            stroke={CHART_COLORS.muted}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={130}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: '#15243C' }}
            formatter={(value) => [yFormatter ? yFormatter(Number(value)) : value, '']}
          />
          <Bar dataKey={yKey} fill={color} radius={[0, 6, 6, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke={CHART_COLORS.muted}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis
          stroke={CHART_COLORS.muted}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={yFormatter}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: '#15243C' }}
          formatter={(value) => [yFormatter ? yFormatter(Number(value)) : value, '']}
        />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
