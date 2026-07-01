import { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ShieldCheck, ShieldOff, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AdminUser, Paginated, Role } from '@/types';
import { ROLE_LABELS } from '@/lib/permissions';
import { formatTimeAgo } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusText } from '@/components/shared/StatusText';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export const Route = createFileRoute('/_app/users')({
  beforeLoad: () => {
    if (!useAuthStore.getState().can('users.read')) {
      throw redirect({ to: '/' });
    }
  },
  component: UsersPage,
});

const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

const ROLES = Object.keys(ROLE_LABELS) as Role[];

const inviteSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.email('Valid email required'),
  role: z.enum(['super_admin', 'finance_admin', 'operations_manager', 'technical_support', 'merchant_support', 'viewer']),
});

type InviteValues = z.infer<typeof inviteSchema>;

function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<{ user: AdminUser; next: Role } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminUser | null>(null);

  const query = useQuery({
    queryKey: userKeys.list(),
    queryFn: () => api.get<Paginated<AdminUser>>('/users', { pageSize: 50 }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: userKeys.all });

  const createUser = useMutation({
    mutationFn: (values: InviteValues) => api.post<AdminUser>('/users', values),
    onSuccess: (u) => {
      invalidate();
      toast.success(`Invitation sent to ${u.email}`);
      setInviteOpen(false);
    },
    onError: () => toast.error('Failed to create user'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AdminUser> }) =>
      api.patch<AdminUser>(`/users/${id}`, input),
    onSuccess: (u) => {
      invalidate();
      toast.success(`${u.name} updated`);
    },
    onError: () => toast.error('Failed to update user'),
  });

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: '', email: '', role: 'viewer' },
  });

  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">
            {row.original.name}
            {row.original.id === currentUser?.id && (
              <span className="ml-2 text-xs text-info">(you)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Select
          value={row.original.role}
          onValueChange={(v) => setRoleTarget({ user: row.original, next: v as Role })}
          disabled={row.original.id === currentUser?.id}
        >
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: 'twoFactorEnabled',
      header: '2FA',
      cell: ({ row }) =>
        row.original.twoFactorEnabled ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <ShieldCheck className="size-4" /> Enabled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-warning">
            <ShieldOff className="size-4" /> Disabled
          </span>
        ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last login',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatTimeAgo(row.original.lastLoginAt)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.id !== currentUser?.id && (
          <Button
            variant="ghost"
            size="sm"
            className={
              row.original.status === 'active'
                ? 'text-destructive hover:text-destructive'
                : 'text-success hover:text-success'
            }
            onClick={() => setToggleTarget(row.original)}
          >
            {row.original.status === 'active' ? (
              <>
                <UserX className="size-4" /> Disable
              </>
            ) : (
              <>
                <UserCheck className="size-4" /> Enable
              </>
            )}
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Admin panel access control — six fixed roles with granular permissions"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" /> Invite user
          </Button>
        }
      />

      <Card className="rounded-2xl p-6">
        <DataTable
          columns={columns}
          data={query.data?.data ?? []}
          loading={query.isPending}
          emptyState={{ title: 'No users' }}
        />
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              The user receives an email invitation with a temporary password.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => createUser.mutate(values))}
          >
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input placeholder="Nino Gelashvili" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="user@multipay.ge" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v as InviteValues['role'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(roleTarget)}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        title={`Change role for ${roleTarget?.user.name}?`}
        description={`${ROLE_LABELS[roleTarget?.user.role ?? 'viewer']} → ${ROLE_LABELS[roleTarget?.next ?? 'viewer']}. Permissions apply on the user's next request.`}
        confirmLabel="Change role"
        pending={updateUser.isPending}
        onConfirm={() => {
          if (!roleTarget) return;
          updateUser.mutate(
            { id: roleTarget.user.id, input: { role: roleTarget.next } },
            { onSettled: () => setRoleTarget(null) },
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={
          toggleTarget?.status === 'active'
            ? `Disable ${toggleTarget?.name}?`
            : `Enable ${toggleTarget?.name}?`
        }
        description={
          toggleTarget?.status === 'active'
            ? 'The user will immediately lose access to the admin panel.'
            : 'The user will regain access with their previous role.'
        }
        confirmLabel={toggleTarget?.status === 'active' ? 'Disable user' : 'Enable user'}
        destructive={toggleTarget?.status === 'active'}
        pending={updateUser.isPending}
        onConfirm={() => {
          if (!toggleTarget) return;
          updateUser.mutate(
            {
              id: toggleTarget.id,
              input: { status: toggleTarget.status === 'active' ? 'disabled' : 'active' },
            },
            { onSettled: () => setToggleTarget(null) },
          );
        }}
      />
    </>
  );
}
