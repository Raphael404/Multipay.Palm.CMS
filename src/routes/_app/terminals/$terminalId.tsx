import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Link2, Pause, Play, Power, Unlink } from 'lucide-react';
import type { DeviceAssignment, DeviceStatus, Terminal } from '@/types';
import {
  useActivateTerminal,
  useAssignDevice,
  useAvailableDevices,
  useResumeTerminal,
  useSuspendTerminal,
  useTerminal,
  useUnassignDevice,
} from '@/features/terminals/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { DetailHeader } from '@/components/shared/DetailHeader';
import { DetailList, DetailRow } from '@/components/shared/DetailList';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { DataTable } from '@/components/shared/DataTable';
import { Can } from '@/components/shared/Can';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { FormField } from '@/components/shared/FormField';
import { OptionSelect, enumOptions } from '@/components/shared/OptionSelect';
import { col } from '@/components/shared/columns';

export const Route = createFileRoute('/_app/terminals/$terminalId')({
  component: TerminalDetailPage,
});

const ACTIVATABLE = new Set(['Registered', 'Provisioned', 'Inactive']);

type DialogKind = 'activate' | 'suspend' | 'resume' | 'assign' | 'unassign' | null;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  terminal: Terminal;
}

function TerminalDetailPage() {
  const { terminalId } = Route.useParams();
  const query = useTerminal(terminalId);
  const [dialog, setDialog] = useState<DialogKind>(null);

  if (query.isError) {
    return <ErrorState message="Terminal not found." onRetry={() => void query.refetch()} />;
  }

  const t = query.data?.terminal;
  const close = () => setDialog(null);

  return (
    <>
      <DetailHeader
        backTo="/terminals"
        loading={!t}
        title={t?.referenceId ?? 'Terminal'}
        description={t && `${statusLabel(t.terminalType)} · registered ${formatDate(t.registeredAt)}`}
        actions={
          t && (
            <>
              <StatusText status={t.status} withDot className="mr-2 text-base" />
              <Can permission="terminals.write">
                {ACTIVATABLE.has(t.status) && (
                  <Button variant="outline" onClick={() => setDialog('activate')}>
                    <Power className="size-4" /> Activate
                  </Button>
                )}
                {t.status === 'Active' && (
                  <Button variant="outline" onClick={() => setDialog('suspend')}>
                    <Pause className="size-4" /> Suspend
                  </Button>
                )}
                {t.status === 'Suspended' && (
                  <Button variant="outline" onClick={() => setDialog('resume')}>
                    <Play className="size-4" /> Resume
                  </Button>
                )}
              </Can>
            </>
          )
        }
      />

      {t ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Terminal">
            <DetailList>
              <DetailRow label="Merchant">
                {t.merchantId && (
                  <Link
                    to="/merchants/$merchantId"
                    params={{ merchantId: t.merchantId }}
                    className="text-info hover:underline"
                  >
                    {t.merchantName ?? t.merchantId}
                  </Link>
                )}
              </DetailRow>
              <DetailRow label="Merchant external ID">{t.merchantExternalId}</DetailRow>
              <DetailRow label="Contact person">{t.contactPersonName}</DetailRow>
              <DetailRow label="Contact phone">{t.contactPhone}</DetailRow>
              <DetailRow label="Last updated">{t.updatedAt && formatDateTime(t.updatedAt)}</DetailRow>
            </DetailList>
          </SectionCard>
          <SectionCard
            title="Current device"
            actions={
              <Can permission="terminals.write">
                {t.currentDevice ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDialog('unassign')}
                  >
                    <Unlink className="size-4" /> Unassign
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setDialog('assign')}>
                    <Link2 className="size-4" /> Assign device
                  </Button>
                )}
              </Can>
            }
          >
            {t.currentDevice ? (
              <DetailList>
                <DetailRow label="Palm module">{t.currentDevice.palmModuleSerialNumber}</DetailRow>
                <DetailRow label="POS unit">{t.currentDevice.posUnitSerialNumber}</DetailRow>
                <DetailRow label="Type">{statusLabel(t.currentDevice.type)}</DetailRow>
                <DetailRow label="Assigned">{formatDateTime(t.currentDevice.assignedAt)}</DetailRow>
              </DetailList>
            ) : (
              <p className="text-sm text-muted-foreground">No device is attached to this terminal.</p>
            )}
          </SectionCard>
        </div>
      ) : (
        <Skeleton className="h-48 w-full rounded-2xl" />
      )}

      <SectionCard title="Device assignment history">
        <DataTable
          columns={historyColumns}
          data={query.data?.assignmentHistory ?? []}
          loading={query.isPending}
          emptyState={{ title: 'No assignments', description: 'No device has been attached yet.' }}
        />
      </SectionCard>

      {t && (
        <>
          <ActivateDialog open={dialog === 'activate'} onClose={close} terminal={t} />
          <ResumeDialog open={dialog === 'resume'} onClose={close} terminal={t} />
          <SuspendDialog open={dialog === 'suspend'} onClose={close} terminal={t} />
          <AssignDialog open={dialog === 'assign'} onClose={close} terminal={t} />
          <UnassignDialog open={dialog === 'unassign'} onClose={close} terminal={t} />
        </>
      )}
    </>
  );
}

/** Date with the optional reason underneath. */
function DateWithReason({ at, reason }: { at: string | null; reason: string | null }) {
  return (
    <div>
      <p>{at ? formatDateTime(at) : '—'}</p>
      {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
    </div>
  );
}

const historyColumns: ColumnDef<DeviceAssignment>[] = [
  col.text('palmModuleSerialNumber', 'Palm module', { strong: true }),
  col.text('posUnitSerialNumber', 'POS unit'),
  {
    accessorKey: 'assignedAt',
    header: 'Assigned',
    cell: ({ row }) => (
      <DateWithReason at={row.original.assignedAt} reason={row.original.assignReason} />
    ),
  },
  {
    accessorKey: 'unassignedAt',
    header: 'Unassigned',
    cell: ({ row }) =>
      row.original.isOpen ? (
        <span className="text-success">Current</span>
      ) : (
        <DateWithReason at={row.original.unassignedAt} reason={row.original.unassignReason} />
      ),
  },
];

const optionalReason = (reason: string) => reason.trim() || undefined;

function ActivateDialog({ open, onClose, terminal }: DialogProps) {
  const activate = useActivateTerminal(terminal.id);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Activate terminal ${terminal.referenceId ?? ''}?`}
      description="The terminal will start accepting palm payments."
      confirmLabel="Activate"
      pending={activate.isPending}
      onConfirm={() => activate.mutate(undefined, { onSuccess: onClose })}
    />
  );
}

function ResumeDialog({ open, onClose, terminal }: DialogProps) {
  const resume = useResumeTerminal(terminal.id);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Resume terminal ${terminal.referenceId ?? ''}?`}
      description="The terminal will resume accepting palm payments."
      confirmLabel="Resume"
      pending={resume.isPending}
      onConfirm={() => resume.mutate(undefined, { onSuccess: onClose })}
    />
  );
}

function ReasonField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FormField label="Reason">
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

function SuspendDialog({ open, onClose, terminal }: DialogProps) {
  const suspend = useSuspendTerminal(terminal.id);
  const [reason, setReason] = useState('');

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Suspend terminal ${terminal.referenceId ?? ''}?`}
      description="Payments on this terminal will be blocked until it is resumed."
      confirmLabel="Suspend"
      destructive
      pending={suspend.isPending}
      onConfirm={() =>
        suspend.mutate(
          { reason: optionalReason(reason) },
          {
            onSuccess: () => {
              setReason('');
              onClose();
            },
          },
        )
      }
    >
      <ReasonField value={reason} onChange={setReason} />
    </ConfirmDialog>
  );
}

function AssignDialog({ open, onClose, terminal }: DialogProps) {
  const assign = useAssignDevice(terminal.id);
  const devices = useAvailableDevices(open);
  const [deviceId, setDeviceId] = useState<string>();
  const [serial, setSerial] = useState('');
  const [reason, setReason] = useState('');

  const close = () => {
    setDeviceId(undefined);
    setSerial('');
    setReason('');
    onClose();
  };

  const deviceOptions = (devices.data ?? []).map((d) => ({
    value: d.id,
    label: `${d.palmModuleSerialNumber ?? d.posUnitSerialNumber ?? d.id}${d.model ? ` · ${d.model}` : ''}`,
  }));

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Assign device"
      description="Pick an in-stock device or enter its palm module serial number."
      confirmLabel="Assign"
      pending={assign.isPending}
      disabled={!deviceId && !serial.trim()}
      onConfirm={() =>
        assign.mutate(
          deviceId
            ? { deviceId, reason: optionalReason(reason) }
            : { palmModuleSerialNumber: serial.trim(), reason: optionalReason(reason) },
          { onSuccess: close },
        )
      }
    >
      <div className="space-y-4">
        <FormField label="In-stock device">
          <OptionSelect
            value={deviceId}
            onChange={(v) => {
              setDeviceId(v);
              if (v) setSerial('');
            }}
            options={deviceOptions}
            allLabel="— Enter serial instead —"
            placeholder={devices.isPending ? 'Loading…' : 'Select device'}
            className="w-full"
          />
        </FormField>
        {!deviceId && (
          <FormField label="Palm module serial number">
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
          </FormField>
        )}
        <ReasonField value={reason} onChange={setReason} />
      </div>
    </ConfirmDialog>
  );
}

const STATUS_AFTER_OPTIONS = enumOptions<DeviceStatus>(['InStock', 'InRepair', 'Retired']);

function UnassignDialog({ open, onClose, terminal }: DialogProps) {
  const unassign = useUnassignDevice(terminal.id);
  const [reason, setReason] = useState('');
  const [statusAfter, setStatusAfter] = useState<DeviceStatus>('InStock');

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Unassign device"
      description={`Detach ${terminal.currentDevice?.palmModuleSerialNumber ?? 'the device'} from this terminal.`}
      confirmLabel="Unassign"
      destructive
      pending={unassign.isPending}
      onConfirm={() =>
        unassign.mutate(
          { reason: optionalReason(reason), deviceStatusAfter: statusAfter },
          {
            onSuccess: () => {
              setReason('');
              setStatusAfter('InStock');
              onClose();
            },
          },
        )
      }
    >
      <div className="space-y-4">
        <FormField label="Device status after">
          <OptionSelect
            value={statusAfter}
            onChange={(v) => v && setStatusAfter(v)}
            options={STATUS_AFTER_OPTIONS}
            className="w-full"
          />
        </FormField>
        <ReasonField value={reason} onChange={setReason} />
      </div>
    </ConfirmDialog>
  );
}
