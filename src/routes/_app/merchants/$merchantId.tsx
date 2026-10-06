import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPin, Pencil, Phone, UserRound } from 'lucide-react';
import type {
  DailyTurnoverItem,
  MerchantDetail,
  MerchantTerminalItem,
  MerchantTransactionItem,
} from '@/types';
import {
  useMerchant,
  useMerchantTerminals,
  useMerchantTransactions,
  useMerchantTurnover,
} from '@/features/merchants/api';
import { MerchantFormSheet } from '@/features/merchants/components/MerchantFormSheet';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { formatDate, formatDateTime, formatGEL, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DetailHeader } from '@/components/shared/DetailHeader';
import { DetailList, DetailRow } from '@/components/shared/DetailList';
import { SectionCard } from '@/components/shared/SectionCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { StatusText } from '@/components/shared/StatusText';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { Can } from '@/components/shared/Can';
import { ErrorState } from '@/components/shared/ErrorState';
import { col } from '@/components/shared/columns';
import { AreaVolumeChart } from '@/components/charts/AreaVolumeChart';

export const Route = createFileRoute('/_app/merchants/$merchantId')({
  component: MerchantDetailPage,
});

const TABS = ['overview', 'terminals', 'turnover', 'transactions'] as const;

function MerchantDetailPage() {
  const { merchantId } = Route.useParams();
  const query = useMerchant(merchantId);
  const [editOpen, setEditOpen] = useState(false);

  if (query.isError) {
    return <ErrorState message="Merchant not found." onRetry={() => void query.refetch()} />;
  }

  const m = query.data;

  return (
    <>
      <DetailHeader
        backTo="/merchants"
        loading={!m}
        title={m?.merchantName ?? 'Merchant'}
        description={[m?.brandName, m?.taxCode && `Tax code ${m.taxCode}`]
          .filter(Boolean)
          .join(' · ')}
        actions={
          m && (
            <>
              <StatusText status={m.status} withDot className="mr-2 text-base" />
              <Can permission="merchants.write">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" /> Edit
                </Button>
              </Can>
            </>
          )
        }
      />

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList className="rounded-xl">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="rounded-lg capitalize">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          {m ? <OverviewTab merchant={m} /> : <Skeleton className="h-64 w-full rounded-2xl" />}
        </TabsContent>
        <TabsContent value="terminals">
          <TerminalsTab merchantId={merchantId} />
        </TabsContent>
        <TabsContent value="turnover">
          <TurnoverTab merchantId={merchantId} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab merchantId={merchantId} />
        </TabsContent>
      </Tabs>

      {m && <MerchantFormSheet open={editOpen} onOpenChange={setEditOpen} merchant={m} />}
    </>
  );
}

function OverviewTab({ merchant }: { merchant: MerchantDetail }) {
  const location = [merchant.address, merchant.district, merchant.region].filter(Boolean).join(', ');
  const contacts = [
    { icon: UserRound, value: merchant.contactPersonName },
    { icon: Phone, value: merchant.contactPhone },
    { icon: MapPin, value: location },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total volume" value={formatGEL(merchant.totalVolume, { compact: true })} />
        <StatCard label="Terminals" value={formatNumber(merchant.terminalCount)} />
        <StatCard label="Merchant since" value={formatDate(merchant.createdAt)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Contact">
          <ul className="space-y-3 text-sm">
            {contacts.map(({ icon: Icon, value }, i) => (
              <li key={i} className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-foreground">{value || '—'}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Account">
          <DetailList>
            <DetailRow label="Status">
              <StatusText status={merchant.status} withDot />
            </DetailRow>
            <DetailRow label="Customer name">{merchant.customerName}</DetailRow>
            <DetailRow label="External ID">{merchant.merchantExternalId}</DetailRow>
            <DetailRow label="Category">{merchant.merchantCategory}</DetailRow>
            <DetailRow label="Profile">{merchant.profile}</DetailRow>
            <DetailRow label="Last updated">
              {merchant.updatedAt && formatDateTime(merchant.updatedAt)}
            </DetailRow>
          </DetailList>
        </SectionCard>
      </div>
    </div>
  );
}

const terminalColumns: ColumnDef<MerchantTerminalItem>[] = [
  col.text('referenceId', 'Terminal', { strong: true }),
  col.label('terminalType', 'Type'),
  col.text('palmModuleSerialNumber', 'Palm module'),
  col.status('status'),
  col.date('createdAt', 'Created', { time: false }),
];

function TerminalsTab({ merchantId }: { merchantId: string }) {
  const navigate = useNavigate();
  const query = useMerchantTerminals(merchantId);

  return (
    <SectionCard title="Terminals">
      <DataTable
        columns={terminalColumns}
        data={query.data ?? []}
        loading={query.isPending}
        error={query.isError}
        onRetry={() => void query.refetch()}
        onRowClick={(t) =>
          void navigate({ to: '/terminals/$terminalId', params: { terminalId: t.terminalId } })
        }
        emptyState={{ title: 'No terminals', description: 'This merchant has no terminals yet.' }}
      />
    </SectionCard>
  );
}

const TURNOVER_DAY_OPTIONS = [7, 30, 90].map((d) => ({
  value: String(d),
  label: `Last ${d} days`,
}));

const turnoverColumns: ColumnDef<DailyTurnoverItem>[] = [
  col.date('date', 'Date', { time: false }),
  col.number('count', 'Transactions'),
  col.money('volume', 'Volume'),
];

function TurnoverTab({ merchantId }: { merchantId: string }) {
  const [days, setDays] = useState(30);
  const query = useMerchantTurnover(merchantId, days);
  const data = query.data;
  const daily = data?.dailyBreakdown ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Volume"
          loading={query.isPending}
          value={formatGEL(data?.totalVolume ?? 0, { compact: true })}
        />
        <StatCard
          label="Transactions"
          loading={query.isPending}
          value={formatNumber(data?.transactionCount ?? 0)}
        />
        <StatCard
          label="Average transaction"
          loading={query.isPending}
          value={formatGEL(data?.averageTransaction ?? 0)}
        />
      </div>
      <ChartCard
        title="Daily turnover"
        actions={
          <OptionSelect
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
            options={TURNOVER_DAY_OPTIONS}
            className="w-36"
          />
        }
        loading={query.isPending}
        error={query.isError}
        onRetry={() => void query.refetch()}
        empty={daily.length === 0}
      >
        <AreaVolumeChart
          data={daily.map((d) => ({ date: formatDate(d.date, 'dd MMM'), volume: d.volume }))}
          xKey="date"
        />
        <DataTable columns={turnoverColumns} data={daily.slice(-10).reverse()} />
      </ChartCard>
    </div>
  );
}

const transactionColumns: ColumnDef<MerchantTransactionItem>[] = [
  col.mono('paymentId', 'Payment ID'),
  col.date('createdAt', 'Date'),
  col.text('terminalReferenceId', 'Terminal'),
  col.money('amount', 'Amount', 'currencyCode'),
  col.status('status'),
];

function TransactionsTab({ merchantId }: { merchantId: string }) {
  const [page, setPage] = useState(1);
  const query = useMerchantTransactions(merchantId, page);

  return (
    <SectionCard>
      <DataTable
        columns={transactionColumns}
        data={query.data?.items ?? []}
        loading={query.isPending}
        error={query.isError}
        onRetry={() => void query.refetch()}
        pagination={{
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          total: query.data?.totalCount ?? 0,
          onPageChange: setPage,
        }}
        emptyState={{ title: 'No transactions', description: 'Nothing recorded yet.' }}
      />
    </SectionCard>
  );
}
