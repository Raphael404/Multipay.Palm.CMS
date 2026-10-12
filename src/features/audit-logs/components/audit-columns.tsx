import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';
import type { AuditLogEntry } from '@/types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { col } from '@/components/shared/columns';
import { EntityLink, type LinkedEntity } from '@/components/shared/EntityLink';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Fields whose values are enum names ("InStock" → "In Stock"). */
const ENUM_FIELDS = new Set(['Status', 'Role', 'TerminalType', 'DeviceType']);

/** Values are stored as strings: dates ISO, booleans "true"/"false", enums by name. */
function formatAuditValue(value: string | null, field: string): string {
  if (value === null || value === '') return '—';
  if (ENUM_FIELDS.has(field)) return statusLabel(value);
  if (ISO_DATE.test(value)) return formatDateTime(value);
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';
  return value;
}

/** Long value truncated, with the full text in a tooltip. */
function AuditValue({ value, field, old }: { value: string | null; field: string; old?: boolean }) {
  const text = formatAuditValue(value, field);
  const span = (
    <span
      className={cn(
        'inline-block max-w-48 truncate align-bottom',
        old && value !== null ? 'text-muted-foreground line-through' : 'text-foreground',
      )}
    >
      {text}
    </span>
  );
  if (text.length <= 28) return span;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{span}</TooltipTrigger>
      <TooltipContent className="max-w-sm break-all">{text}</TooltipContent>
    </Tooltip>
  );
}

function ShortId({ id }: { id: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-mono text-xs text-muted-foreground">{id.slice(0, 8)}</span>
      </TooltipTrigger>
      <TooltipContent className="font-mono">{id}</TooltipContent>
    </Tooltip>
  );
}

/** Entities without a detail page get a short id. */
const LINKED = new Set<string>(['Terminal', 'Merchant', 'Device']);

function EntityRef({ row }: { row: AuditLogEntry }) {
  if (!LINKED.has(row.entityType)) return <ShortId id={row.entityId} />;
  return (
    <EntityLink type={row.entityType as LinkedEntity} id={row.entityId} className="font-mono text-xs">
      {row.entityId.slice(0, 8)}
    </EntityLink>
  );
}

const changeColumn: ColumnDef<AuditLogEntry> = {
  id: 'change',
  header: 'Change',
  cell: ({ row }) => {
    const { action, field, oldValue, newValue } = row.original;
    if (action === 'Created') return <AuditValue value={newValue} field={field} />;
    if (action === 'Deleted') return <AuditValue value={oldValue} field={field} old />;
    return (
      <span className="inline-flex items-center gap-2">
        <AuditValue value={oldValue} field={field} old />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
        <AuditValue value={newValue} field={field} />
      </span>
    );
  },
};

const fieldColumn: ColumnDef<AuditLogEntry> = {
  accessorKey: 'field',
  header: 'Field',
  cell: ({ row }) => <span className="font-medium text-foreground">{statusLabel(row.original.field)}</span>,
};

const actionColumn: ColumnDef<AuditLogEntry> = {
  accessorKey: 'action',
  header: 'Action',
  cell: ({ row }) => <StatusText status={row.original.action} withDot />,
};

/** Full audit-log table. */
export const auditColumns: ColumnDef<AuditLogEntry>[] = [
  col.date('changedAt', 'Changed at'),
  col.text('actorEmail', 'Actor'),
  actionColumn,
  {
    id: 'entity',
    header: 'Entity',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <span>{statusLabel(row.original.entityType)}</span>
        <EntityRef row={row.original} />
      </span>
    ),
  },
  fieldColumn,
  changeColumn,
  col.mono('ipAddress', 'IP'),
];

/** History of one entity: the entity column is implied. */
export const entityHistoryColumns: ColumnDef<AuditLogEntry>[] = [
  col.date('changedAt', 'Changed at'),
  col.text('actorEmail', 'Actor'),
  actionColumn,
  {
    accessorKey: 'entityType',
    header: 'Entity',
    cell: ({ row }) => statusLabel(row.original.entityType),
  },
  fieldColumn,
  changeColumn,
];

/**
 * Rows from one save share `correlationId`; alternate a subtle background per
 * group so a multi-field change reads as one.
 */
export function correlationBands(rows: AuditLogEntry[]) {
  const band = new Map<string, number>();
  let prev: string | undefined;
  let n = 0;
  for (const r of rows) {
    if (r.correlationId !== prev) n++;
    prev = r.correlationId;
    if (!band.has(r.id)) band.set(r.id, n);
  }
  return (row: AuditLogEntry) =>
    (band.get(row.id) ?? 0) % 2 === 0 ? 'bg-card-elevated/60 hover:bg-card-elevated' : undefined;
}
