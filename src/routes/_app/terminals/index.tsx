import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { Plus, Search } from 'lucide-react';
import type { Terminal, TerminalStatus } from '@/types';
import { useCreateTerminal, useTerminals, useUpdateTerminal } from '@/features/terminals/api';
import { useMerchantOptions } from '@/features/merchants/api';
import { formatDate, formatTimeAgo } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { Can } from '@/components/shared/Can';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  status: z.string().optional().catch(undefined),
  merchantId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/terminals/')({
  validateSearch: searchSchema,
  component: TerminalsPage,
});

const STATUSES: TerminalStatus[] = ['online', 'offline', 'maintenance', 'decommissioned'];

function TerminalsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page = 1, search = '', status, merchantId } = Route.useSearch();
  const merchants = useMerchantOptions();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{
    terminal: Terminal;
    next: TerminalStatus;
  } | null>(null);

  const query = useTerminals({
    page,
    pageSize: 10,
    search: search || undefined,
    status: status ? [status] : undefined,
    merchantId,
  });

  const updateStatus = useUpdateTerminal(statusTarget?.terminal.id ?? '');

  const setSearch = (
    patch: Partial<{ search: string; status?: string; merchantId?: string }>,
  ) => void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }), replace: true });

  const merchantName = (id: string | null) =>
    merchants.data?.find((m) => m.id === id)?.name ?? (id ? id : 'Unassigned');

  const columns: ColumnDef<Terminal>[] = [
    {
      accessorKey: 'id',
      header: 'Terminal ID',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.id}</span>,
    },
    { accessorKey: 'serialNumber', header: 'Serial Number' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
    {
      accessorKey: 'merchantId',
      header: 'Merchant',
      cell: ({ row }) => (
        <span className={row.original.merchantId ? '' : 'text-muted-foreground'}>
          {merchantName(row.original.merchantId)}
        </span>
      ),
    },
    {
      accessorKey: 'locationAddress',
      header: 'Location',
      cell: ({ row }) => (
        <span className="block max-w-56 truncate text-muted-foreground">
          {row.original.locationAddress}
        </span>
      ),
    },
    {
      accessorKey: 'installedAt',
      header: 'Installed',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.installedAt)}</span>
      ),
    },
    {
      accessorKey: 'lastSeenAt',
      header: 'Last seen',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatTimeAgo(row.original.lastSeenAt)}</span>
      ),
    },
    {
      id: 'setStatus',
      header: '',
      cell: ({ row }) => (
        <Can permission="terminals.write">
          <Select
            value={row.original.status}
            onValueChange={(v) =>
              setStatusTarget({ terminal: row.original, next: v as TerminalStatus })
            }
          >
            <SelectTrigger
              size="sm"
              className="w-40"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Can>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Palm Terminals"
        description="Monitor and manage the palm-authentication terminal fleet"
        actions={
          <Can permission="terminals.write">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Register terminal
            </Button>
          </Can>
        }
      />

      <Card className="rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ID, serial, location..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch({ search: e.target.value })}
            />
          </div>
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => setSearch({ status: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={merchantId ?? 'all'}
            onValueChange={(v) => setSearch({ merchantId: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All merchants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All merchants</SelectItem>
              {(merchants.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={query.data?.data ?? []}
            loading={query.isPending}
            pagination={{
              page,
              pageSize: query.data?.meta.pageSize ?? 10,
              total: query.data?.meta.total ?? 0,
              onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
            }}
            onRowClick={(t) =>
              void navigate({ to: '/terminals/$terminalId', params: { terminalId: t.id } })
            }
            emptyState={{ title: 'No terminals found' }}
          />
        )}
      </Card>

      <CreateTerminalSheet open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={`Change status of ${statusTarget?.terminal.id}?`}
        description={`${statusTarget?.terminal.id} will be set to "${statusLabel(statusTarget?.next ?? '')}". This action is recorded in the audit log.`}
        confirmLabel="Change status"
        destructive={statusTarget?.next === 'decommissioned'}
        pending={updateStatus.isPending}
        onConfirm={() => {
          if (!statusTarget) return;
          updateStatus.mutate(
            { status: statusTarget.next },
            { onSettled: () => setStatusTarget(null) },
          );
        }}
      />
    </>
  );
}

function CreateTerminalSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateTerminal();
  const merchants = useMerchantOptions();
  const [serialNumber, setSerialNumber] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [merchantId, setMerchantId] = useState<string>('none');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Register terminal</SheetTitle>
          <SheetDescription>
            New terminals start offline until their first heartbeat.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-1.5">
            <Label>Serial number</Label>
            <Input
              placeholder="SN0A1B2C3D4E"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location address</Label>
            <Input
              placeholder="12 Chavchavadze Ave, Tbilisi"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Assign to merchant (optional)</Label>
            <Select value={merchantId} onValueChange={setMerchantId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(merchants.data ?? [])
                  .filter((m) => m.status === 'active')
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={!serialNumber || !locationAddress || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  serialNumber,
                  locationAddress,
                  merchantId: merchantId === 'none' ? null : merchantId,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setSerialNumber('');
                    setLocationAddress('');
                    setMerchantId('none');
                  },
                },
              )
            }
          >
            Register terminal
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
