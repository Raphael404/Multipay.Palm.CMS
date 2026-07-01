import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { Pencil, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { merchantKeys } from '@/features/merchants/api';
import { formatGEL, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { Can } from '@/components/shared/Can';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  PeriodPicker,
  usePeriodRange,
  type PeriodValue,
} from '@/components/shared/PeriodPicker';

const searchSchema = z.object({
  period: z.enum(['today', '7d', '30d', 'custom']).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/commissions')({
  validateSearch: searchSchema,
  component: CommissionsPage,
});

interface CommissionRow {
  merchantId: string;
  merchantName: string;
  rate: number;
  volume: number;
  commission: number;
  txCount: number;
}

interface CommissionSummary {
  total: number;
  byMerchant: CommissionRow[];
}

function CommissionsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const periodValue: PeriodValue = {
    period: search.period ?? '30d',
    from: search.from,
    to: search.to,
  };
  const range = usePeriodRange(periodValue);
  const queryClient = useQueryClient();

  const summary = useQuery({
    queryKey: ['commissions', 'summary', range],
    queryFn: () => api.get<CommissionSummary>('/commissions/summary', range),
  });

  const [editTarget, setEditTarget] = useState<CommissionRow | null>(null);
  const [newRate, setNewRate] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updateRate = useMutation({
    mutationFn: ({ merchantId, rate }: { merchantId: string; rate: number }) =>
      api.patch(`/merchants/${merchantId}`, { commissionRate: rate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commissions'] });
      void queryClient.invalidateQueries({ queryKey: merchantKeys.all });
      toast.success('Commission rate updated', {
        description: 'The change was recorded in the audit log.',
      });
    },
    onError: () => toast.error('Failed to update commission rate'),
  });

  const columns: ColumnDef<CommissionRow>[] = [
    {
      accessorKey: 'merchantName',
      header: 'Merchant',
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.merchantName}</span>
      ),
    },
    {
      accessorKey: 'rate',
      header: 'Rate',
      cell: ({ row }) => `${row.original.rate.toFixed(1)}%`,
    },
    { accessorKey: 'txCount', header: 'Transactions' },
    {
      accessorKey: 'volume',
      header: 'Base volume',
      cell: ({ row }) => formatGEL(row.original.volume, { compact: true }),
    },
    {
      accessorKey: 'commission',
      header: 'Commission earned',
      cell: ({ row }) => (
        <span className="font-semibold text-success">{formatGEL(row.original.commission)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Can permission="commissions.write">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditTarget(row.original);
              setNewRate(row.original.rate.toFixed(1));
            }}
          >
            <Pencil className="size-4" /> Edit rate
          </Button>
        </Can>
      ),
    },
  ];

  const totalVolume = (summary.data?.byMerchant ?? []).reduce((s, m) => s + m.volume, 0);

  return (
    <>
      <PageHeader
        title="Commissions"
        description="Commission earnings and per-merchant rates"
        actions={
          <PeriodPicker
            value={periodValue}
            onChange={(v) =>
              void navigate({
                search: () => ({ period: v.period, from: v.from, to: v.to }),
                replace: true,
              })
            }
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total commission earned"
          icon={<Percent className="size-4" />}
          loading={summary.isPending}
          value={<span className="text-success">{formatGEL(summary.data?.total ?? 0)}</span>}
        />
        <StatCard
          label="Base volume"
          loading={summary.isPending}
          value={formatGEL(totalVolume, { compact: true })}
        />
        <StatCard
          label="Merchants with activity"
          loading={summary.isPending}
          value={formatNumber(summary.data?.byMerchant.length ?? 0)}
        />
      </div>

      <Card className="rounded-2xl p-6">
        <DataTable
          columns={columns}
          data={summary.data?.byMerchant ?? []}
          loading={summary.isPending}
          emptyState={{ title: 'No commission data for this period' }}
        />
      </Card>

      {/* edit rate dialog */}
      <ConfirmDialog
        open={Boolean(editTarget) && !confirmOpen}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={`Change commission for ${editTarget?.merchantName}`}
        description={
          <span className="block space-y-3">
            <span className="block text-sm">
              Current rate: <strong>{editTarget?.rate.toFixed(1)}%</strong>
            </span>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="mt-2"
            />
          </span>
        }
        confirmLabel="Review change"
        onConfirm={() => {
          const rate = Number(newRate);
          if (!Number.isFinite(rate) || rate < 0.1 || rate > 10) {
            toast.error('Rate must be between 0.1% and 10%');
            return;
          }
          setConfirmOpen(true);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm commission change"
        description={`${editTarget?.merchantName}: ${editTarget?.rate.toFixed(1)}% → ${Number(newRate).toFixed(1)}%. This change takes effect immediately and is written to the audit log.`}
        confirmLabel="Apply new rate"
        pending={updateRate.isPending}
        onConfirm={() => {
          if (!editTarget) return;
          updateRate.mutate(
            { merchantId: editTarget.merchantId, rate: Number(newRate) },
            {
              onSettled: () => {
                setConfirmOpen(false);
                setEditTarget(null);
              },
            },
          );
        }}
      />
    </>
  );
}
