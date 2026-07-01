import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS, tooltipStyle } from './chart-theme';
import { statusLabel } from '@/components/shared/StatusText';

const STATUS_COLORS: Record<string, string> = {
  success: CHART_COLORS.success,
  failed: CHART_COLORS.destructive,
  pending: CHART_COLORS.warning,
  refunded: CHART_COLORS.info,
};

export function DonutRatio({
  data,
  height = 260,
}: {
  data: { status: string; count: number }[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? CHART_COLORS.muted} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-foreground">{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">last 24h</p>
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.status} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[d.status] ?? CHART_COLORS.muted }}
            />
            <span className="text-muted-foreground">{statusLabel(d.status)}</span>
            <span className="ml-auto pl-4 font-semibold text-foreground">
              {total ? Math.round((d.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
