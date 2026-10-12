import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { DEVICE_STATUSES, DEVICE_TYPES, type Device } from '@/types';
import { useDevices } from '@/features/devices/api';
import { DeviceFormSheet } from '@/features/devices/components/DeviceFormSheet';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { listSearchParams, optionalParam } from '@/lib/search-params';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { OptionSelect, enumOptions } from '@/components/shared/OptionSelect';
import { Can } from '@/components/shared/Can';
import { EntityLink } from '@/components/shared/EntityLink';
import { col } from '@/components/shared/columns';

const searchSchema = z.object({
  ...listSearchParams,
  status: optionalParam(z.enum(DEVICE_STATUSES)),
  type: optionalParam(z.enum(DEVICE_TYPES)),
});

export const Route = createFileRoute('/_app/devices/')({
  validateSearch: searchSchema,
  component: DevicesPage,
});

const STATUS_OPTIONS = enumOptions(DEVICE_STATUSES);
const TYPE_OPTIONS = enumOptions(DEVICE_TYPES);

const columns: ColumnDef<Device>[] = [
  col.text('palmModuleSerialNumber', 'Palm module', { strong: true }),
  col.text('posUnitSerialNumber', 'POS unit'),
  col.label('type', 'Type'),
  col.text('model', 'Model', { muted: true }),
  col.status('status'),
  {
    id: 'placement',
    header: 'Placement',
    cell: ({ row }) => {
      const p = row.original.currentPlacement;
      if (!p) return <span className="text-muted-foreground">Not placed</span>;
      return (
        <div>
          <EntityLink type="Terminal" id={p.terminalId}>
            {p.terminalReferenceId ?? p.terminalId.slice(0, 8)}
          </EntityLink>
          {p.merchantName && <p className="text-xs text-muted-foreground">{p.merchantName}</p>}
        </div>
      );
    },
  },
  col.date('registeredAt', 'Registered', { time: false }),
];

/** The devices endpoint has no search, so it is matched here. */
function matches(d: Device, q: string) {
  return [d.palmModuleSerialNumber, d.posUnitSerialNumber, d.model].some((v) =>
    v?.toLowerCase().includes(q),
  );
}

function DevicesPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page = 1, search = '', status, type } = Route.useSearch();
  const [registerOpen, setRegisterOpen] = useState(false);

  const query = useDevices({ status, type });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = query.data ?? [];
    return q ? all.filter((d) => matches(d, q)) : all;
  }, [query.data, search]);

  // The endpoint returns every device at once; page on the client. Clamp so a
  // stale `page` (deep link, list shrank) still shows the last page.
  const pageCount = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (currentPage - 1) * DEFAULT_PAGE_SIZE,
    currentPage * DEFAULT_PAGE_SIZE,
  );

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }), replace: true });

  return (
    <>
      <PageHeader
        title="Devices"
        description="Palm modules and POS units, their status and placement"
        actions={
          <Can permission="devices.write">
            <Button onClick={() => setRegisterOpen(true)}>
              <Plus className="size-4" /> Register device
            </Button>
          </Can>
        }
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search serial, model..."
            value={search}
            onChange={(v) => setSearch({ search: v || undefined })}
          />
          <OptionSelect
            value={status}
            onChange={(v) => setSearch({ status: v })}
            options={STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <OptionSelect
            value={type}
            onChange={(v) => setSearch({ type: v })}
            options={TYPE_OPTIONS}
            allLabel="All types"
          />
        </div>

        <DataTable
          columns={columns}
          data={pageRows}
          loading={query.isPending}
          error={query.isError}
          onRetry={() => void query.refetch()}
          pagination={{
            page: currentPage,
            pageSize: DEFAULT_PAGE_SIZE,
            total: filtered.length,
            onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
          }}
          onRowClick={(d) => void navigate({ to: '/devices/$deviceId', params: { deviceId: d.id } })}
          emptyState={{ title: 'No devices found', description: 'Adjust the search or filters.' }}
        />
      </SectionCard>

      <DeviceFormSheet
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onCreated={(d) =>
          d?.id && void navigate({ to: '/devices/$deviceId', params: { deviceId: d.id } })
        }
      />
    </>
  );
}
