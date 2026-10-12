import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, RefreshCw } from 'lucide-react';
import { DEVICE_STATUSES, type Device, type DeviceAssignment, type DeviceStatus } from '@/types';
import { useChangeDeviceStatus, useDevice } from '@/features/devices/api';
import { DeviceFormSheet } from '@/features/devices/components/DeviceFormSheet';
import { EntityHistory } from '@/features/audit-logs/components/EntityHistory';
import { formatDate, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailHeader } from '@/components/shared/DetailHeader';
import { DetailList, DetailRow } from '@/components/shared/DetailList';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { DataTable } from '@/components/shared/DataTable';
import { Can } from '@/components/shared/Can';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { FormField } from '@/components/shared/FormField';
import { ReasonField, optionalReason } from '@/components/shared/ReasonField';
import { EntityLink } from '@/components/shared/EntityLink';
import { assignmentPeriodColumns } from '@/features/devices/components/assignment-columns';
import { OptionSelect, enumOptions } from '@/components/shared/OptionSelect';
import { col } from '@/components/shared/columns';

export const Route = createFileRoute('/_app/devices/$deviceId')({
  component: DeviceDetailPage,
});

function DeviceDetailPage() {
  const { deviceId } = Route.useParams();
  const query = useDevice(deviceId);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  if (query.isError) {
    return <ErrorState message="Device not found." onRetry={() => void query.refetch()} />;
  }

  const d = query.data?.device;
  const p = d?.currentPlacement;

  return (
    <>
      <DetailHeader
        backTo="/devices"
        loading={!d}
        title={d?.palmModuleSerialNumber ?? d?.posUnitSerialNumber ?? 'Device'}
        description={d && `${statusLabel(d.type)} · registered ${formatDate(d.registeredAt)}`}
        actions={
          d && (
            <>
              <StatusText status={d.status} withDot className="mr-2 text-base" />
              <Can permission="devices.write">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                {/* A placed device changes status through unassign on its terminal. */}
                {!d.currentPlacement && (
                  <Button variant="outline" onClick={() => setStatusOpen(true)}>
                    <RefreshCw className="size-4" /> Change status
                  </Button>
                )}
              </Can>
            </>
          )
        }
      />

      {d ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Device">
            <DetailList>
              <DetailRow label="Palm module">{d.palmModuleSerialNumber}</DetailRow>
              <DetailRow label="POS unit">{d.posUnitSerialNumber}</DetailRow>
              <DetailRow label="Type">{statusLabel(d.type)}</DetailRow>
              <DetailRow label="Model">{d.model}</DetailRow>
              <DetailRow label="Notes">{d.notes}</DetailRow>
              <DetailRow label="Last updated">{d.updatedAt && formatDateTime(d.updatedAt)}</DetailRow>
            </DetailList>
          </SectionCard>
          <SectionCard title="Current placement">
            {p ? (
              <DetailList>
                <DetailRow label="Terminal">
                  <EntityLink type="Terminal" id={p.terminalId}>
                    {p.terminalReferenceId ?? p.terminalId}
                  </EntityLink>
                </DetailRow>
                <DetailRow label="Terminal status">
                  <StatusText status={p.terminalStatus} withDot />
                </DetailRow>
                <DetailRow label="Merchant">
                  {p.merchantId && (
                    <EntityLink type="Merchant" id={p.merchantId}>
                      {p.merchantName ?? p.merchantId}
                    </EntityLink>
                  )}
                </DetailRow>
                <DetailRow label="Assigned">{formatDateTime(p.assignedAt)}</DetailRow>
              </DetailList>
            ) : (
              <p className="text-sm text-muted-foreground">This device is not placed on a terminal.</p>
            )}
          </SectionCard>
        </div>
      ) : (
        <Skeleton className="h-48 w-full rounded-2xl" />
      )}

      <SectionCard title="Assignment history">
        <DataTable
          columns={historyColumns}
          data={query.data?.assignmentHistory ?? []}
          loading={query.isPending}
          emptyState={{ title: 'No assignments', description: 'This device has never been placed.' }}
        />
      </SectionCard>

      <EntityHistory entityType="Device" entityId={deviceId} />

      {d && (
        <>
          <DeviceFormSheet open={editOpen} onOpenChange={setEditOpen} device={d} />
          <ChangeStatusDialog open={statusOpen} onClose={() => setStatusOpen(false)} device={d} />
        </>
      )}
    </>
  );
}

const historyColumns: ColumnDef<DeviceAssignment>[] = [
  {
    accessorKey: 'terminalReferenceId',
    header: 'Terminal',
    cell: ({ row }) => (
      <EntityLink type="Terminal" id={row.original.terminalId} className="font-medium">
        {row.original.terminalReferenceId ?? row.original.terminalId.slice(0, 8)}
      </EntityLink>
    ),
  },
  col.text('merchantName', 'Merchant'),
  ...assignmentPeriodColumns,
];

/** `Assigned` is set only through terminal assignment, so it is not offered here. */
const STATUS_OPTIONS = enumOptions(DEVICE_STATUSES.filter((s) => s !== 'Assigned'));

function ChangeStatusDialog({
  open,
  onClose,
  device,
}: {
  open: boolean;
  onClose: () => void;
  device: Device;
}) {
  const change = useChangeDeviceStatus(device.id);
  const [status, setStatus] = useState<DeviceStatus>();
  const [reason, setReason] = useState('');

  const close = () => {
    setStatus(undefined);
    setReason('');
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Change device status"
      description={`Current status: ${statusLabel(device.status)}`}
      confirmLabel="Change status"
      pending={change.isPending}
      disabled={!status || status === device.status}
      onConfirm={() =>
        status &&
        change.mutate({ status, reason: optionalReason(reason) }, { onSuccess: close })
      }
    >
      <div className="space-y-4">
        <FormField label="New status">
          <OptionSelect
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.filter((o) => o.value !== device.status)}
            placeholder="Select status"
            className="w-full"
          />
        </FormField>
        <ReasonField value={reason} onChange={setReason} />
      </div>
    </ConfirmDialog>
  );
}
