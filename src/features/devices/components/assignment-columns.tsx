import type { ColumnDef } from '@tanstack/react-table';
import type { DeviceAssignment } from '@/types';
import { formatDateTime } from '@/lib/format';

/** Date with the optional reason underneath. */
function DateWithReason({ at, reason }: { at: string | null; reason: string | null }) {
  return (
    <div>
      <p>{at ? formatDateTime(at) : '—'}</p>
      {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
    </div>
  );
}

/** Assigned / Unassigned columns shared by the terminal and device assignment histories. */
export const assignmentPeriodColumns: ColumnDef<DeviceAssignment>[] = [
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
