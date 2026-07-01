import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeft,
  Download,
  FileText,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Unlink,
  Upload,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Merchant, MerchantDocument, Terminal } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  merchantKeys,
  useMerchant,
  useMerchantTurnover,
  useUploadDocument,
} from '@/features/merchants/api';
import { terminalKeys, useTerminals } from '@/features/terminals/api';
import { MerchantFormSheet } from '@/features/merchants/components/MerchantFormSheet';
import { TxMiniTable } from '@/features/transactions/components/TxMiniTable';
import { formatDate, formatDateTime, formatGEL, formatTimeAgo } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusText } from '@/components/shared/StatusText';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { Can } from '@/components/shared/Can';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { AreaVolumeChart } from '@/components/charts/AreaVolumeChart';

export const Route = createFileRoute('/_app/merchants/$merchantId')({
  component: MerchantDetailPage,
});

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/merchants">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        {m ? (
          <PageHeader
            title={m.name}
            description={`${m.legalName} · Tax ID ${m.taxId}`}
            actions={
              <>
                <StatusText status={m.status} withDot className="mr-2 text-base" />
                <Can permission="merchants.write">
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                </Can>
              </>
            }
          />
        ) : (
          <Skeleton className="h-10 w-72" />
        )}
      </div>

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList className="rounded-xl">
          {['overview', 'terminals', 'turnover', 'transactions', 'documents', 'commission'].map(
            (tab) => (
              <TabsTrigger key={tab} value={tab} className="rounded-lg capitalize">
                {tab}
              </TabsTrigger>
            ),
          )}
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
          <Card className="rounded-2xl p-6">
            <TxMiniTable filters={{ merchantId: [merchantId] }} pageSize={10} />
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          {m ? <DocumentsTab merchant={m} /> : <Skeleton className="h-64 w-full rounded-2xl" />}
        </TabsContent>
        <TabsContent value="commission">
          {m ? <CommissionTab merchant={m} /> : <Skeleton className="h-64 w-full rounded-2xl" />}
        </TabsContent>
      </Tabs>

      <MerchantFormSheet open={editOpen} onOpenChange={setEditOpen} merchant={m ?? null} />
    </>
  );
}

function OverviewTab({ merchant }: { merchant: Merchant }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Today" value={formatGEL(merchant.turnover.today, { compact: true })} />
        <StatCard label="This week" value={formatGEL(merchant.turnover.week, { compact: true })} />
        <StatCard label="This month" value={formatGEL(merchant.turnover.month, { compact: true })} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 rounded-2xl p-6">
          <h3 className="font-semibold text-foreground">Contact</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <UserRound className="size-4 text-muted-foreground" />
              <span className="text-foreground">{merchant.contact.person}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="size-4 text-muted-foreground" />
              <span className="text-foreground">{merchant.contact.phone}</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-foreground">{merchant.contact.email}</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="size-4 text-muted-foreground" />
              <span className="text-foreground">{merchant.contact.address}</span>
            </li>
          </ul>
        </Card>
        <Card className="gap-4 rounded-2xl p-6">
          <h3 className="font-semibold text-foreground">Account</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusText status={merchant.status} withDot />
            </dd>
            <dt className="text-muted-foreground">Commission rate</dt>
            <dd className="font-medium text-foreground">{merchant.commissionRate.toFixed(1)}%</dd>
            <dt className="text-muted-foreground">Terminals</dt>
            <dd className="font-medium text-foreground">{merchant.terminalIds.length}</dd>
            <dt className="text-muted-foreground">Merchant since</dt>
            <dd className="font-medium text-foreground">{formatDate(merchant.createdAt)}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}

function TerminalsTab({ merchantId }: { merchantId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useTerminals({ merchantId, pageSize: 100 });
  const detach = useMutation({
    mutationFn: (terminalId: string) =>
      api.patch<Terminal>(`/terminals/${terminalId}`, { merchantId: null }),
    onSuccess: (t) => {
      void queryClient.invalidateQueries({ queryKey: terminalKeys.all });
      void queryClient.invalidateQueries({ queryKey: merchantKeys.all });
      toast.success(`Terminal ${t.id} detached`);
    },
    onError: () => toast.error('Failed to detach terminal'),
  });

  const columns: ColumnDef<Terminal>[] = [
    {
      accessorKey: 'id',
      header: 'Terminal',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.id}</span>,
    },
    { accessorKey: 'serialNumber', header: 'Serial' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
    {
      accessorKey: 'lastSeenAt',
      header: 'Last seen',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatTimeAgo(row.original.lastSeenAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Can permission="terminals.write">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={detach.isPending}
            onClick={(e) => {
              e.stopPropagation();
              detach.mutate(row.original.id);
            }}
          >
            <Unlink className="size-4" /> Detach
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <Card className="rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Linked terminals</h3>
        <Can permission="terminals.write">
          <Button variant="outline" size="sm" asChild>
            <Link to="/terminals">
              <Link2 className="size-4" /> Attach from terminal list
            </Link>
          </Button>
        </Can>
      </div>
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        loading={query.isPending}
        onRowClick={(t) =>
          void navigate({ to: '/terminals/$terminalId', params: { terminalId: t.id } })
        }
        emptyState={{
          title: 'No terminals attached',
          description: 'Assign terminals to this merchant from the Palm Terminals page.',
        }}
      />
    </Card>
  );
}

function TurnoverTab({ merchantId }: { merchantId: string }) {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const query = useMerchantTurnover(merchantId, granularity);

  return (
    <Card className="rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Turnover</h3>
        <Select value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Last 14 days</SelectItem>
            <SelectItem value="weekly">Last 4 weeks</SelectItem>
            <SelectItem value="monthly">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {query.isPending ? (
        <Skeleton className="h-[260px] w-full" />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="No turnover data" description="No successful transactions in this period." />
      ) : (
        <>
          <AreaVolumeChart data={query.data ?? []} xKey="date" />
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card-elevated/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Transactions</th>
                  <th className="px-4 py-2.5 text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {(query.data ?? []).slice(-10).map((row) => (
                  <tr key={row.date} className="border-t border-border">
                    <td className="px-4 py-2.5 text-muted-foreground">{row.date}</td>
                    <td className="px-4 py-2.5">{row.count}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">
                      {formatGEL(row.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function DocumentsTab({ merchant }: { merchant: Merchant }) {
  const upload = useUploadDocument(merchant.id);

  const columns: ColumnDef<MerchantDocument>[] = [
    {
      accessorKey: 'name',
      header: 'Document',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <FileText className="size-4 text-info" /> {row.original.name}
        </span>
      ),
    },
    { accessorKey: 'type', header: 'Type' },
    {
      accessorKey: 'uploadedAt',
      header: 'Uploaded',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDateTime(row.original.uploadedAt)}</span>
      ),
    },
    {
      id: 'download',
      header: '',
      cell: () => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toast.info('Download started (mock)')}
        >
          <Download className="size-4" /> Download
        </Button>
      ),
    },
  ];

  return (
    <Card className="rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">KYC & legal documents</h3>
        <Can permission="merchants.write">
          <Button
            variant="outline"
            size="sm"
            disabled={upload.isPending}
            onClick={() =>
              upload.mutate({
                name: `Uploaded document ${merchant.documents.length + 1}.pdf`,
                type: 'application/pdf',
              })
            }
          >
            <Upload className="size-4" /> Upload document
          </Button>
        </Can>
      </div>
      <DataTable
        columns={columns}
        data={merchant.documents}
        emptyState={{ title: 'No documents', description: 'Upload KYC documents for this merchant.' }}
      />
    </Card>
  );
}

function CommissionTab({ merchant }: { merchant: Merchant }) {
  return (
    <Card className="rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Commission rate history</h3>
          <p className="text-sm text-muted-foreground">
            Current rate: <span className="font-semibold text-foreground">{merchant.commissionRate.toFixed(1)}%</span>
          </p>
        </div>
      </div>
      <ol className="space-y-0">
        {[...merchant.commissionHistory].reverse().map((entry, i) => (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 size-2.5 rounded-full bg-info" />
              {i < merchant.commissionHistory.length - 1 && (
                <span className="w-px flex-1 bg-border" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">{entry.rate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(entry.changedAt)} · by {entry.changedBy}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
