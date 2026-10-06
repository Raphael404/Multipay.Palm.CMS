import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, UserCheck, UserX } from 'lucide-react';
import { ROLES, type AdminUser, type Role } from '@/types';
import {
  useChangeUserRole,
  useInviteUser,
  useToggleUserStatus,
  useUsers,
} from '@/features/users/api';
import { ROLE_LABELS } from '@/lib/permissions';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { listSearchParams, optionalParam } from '@/lib/search-params';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Can } from '@/components/shared/Can';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusText } from '@/components/shared/StatusText';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SectionCard } from '@/components/shared/SectionCard';
import { SearchInput } from '@/components/shared/SearchInput';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { FormField } from '@/components/shared/FormField';
import { col } from '@/components/shared/columns';

const searchSchema = z.object({
  ...listSearchParams,
  role: optionalParam(z.enum(ROLES)),
});

export const Route = createFileRoute('/_app/users')({
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (!useAuthStore.getState().can('users.read')) {
      throw redirect({ to: '/' });
    }
  },
  component: UsersPage,
});

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

const inviteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.email('Valid email required'),
  phoneNumber: z.string().min(5, 'Phone number is required'),
  password: z.string().min(8, 'At least 8 characters'),
  role: z.enum(ROLES),
});

type InviteValues = z.infer<typeof inviteSchema>;

const INVITE_DEFAULTS: InviteValues = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  role: 'Operator',
};

function fullName(u: AdminUser) {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

function UsersPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page = 1, search = '', role } = Route.useSearch();
  const currentUser = useAuthStore((s) => s.user);
  const canWrite = useAuthStore((s) => s.can('users.write'));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<{ user: AdminUser; next: Role } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminUser | null>(null);

  const query = useUsers({ search: search || undefined, role, page });

  const inviteUser = useInviteUser();
  const changeRole = useChangeUserRole();
  const toggleStatus = useToggleUserStatus();

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: INVITE_DEFAULTS,
  });
  const errors = form.formState.errors;

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }), replace: true });

  const closeInvite = () => {
    setInviteOpen(false);
    form.reset();
  };

  const isSelf = (u: AdminUser) =>
    Boolean(currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase());

  const columns: ColumnDef<AdminUser>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {fullName(row.original)}
          {isSelf(row.original) && <span className="ml-2 text-xs text-info">(you)</span>}
        </span>
      ),
    },
    col.text<AdminUser>('email', 'Email', { muted: true }),
    col.text<AdminUser>('phoneNumber', 'Phone', { muted: true }),
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) =>
        canWrite && !isSelf(row.original) ? (
          <OptionSelect
            value={row.original.role}
            onChange={(next) => next && setRoleTarget({ user: row.original, next })}
            options={ROLE_OPTIONS}
            size="sm"
            className="w-40"
          />
        ) : (
          <span>{ROLE_LABELS[row.original.role] ?? row.original.role}</span>
        ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusText status={row.original.isActive ? 'Active' : 'Disabled'} withDot />
      ),
    },
    col.date<AdminUser>('createdAt', 'Created', { time: false }),
    ...(canWrite
      ? ([
          {
            id: 'actions',
            header: '',
            cell: ({ row }) =>
              !isSelf(row.original) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    row.original.isActive
                      ? 'text-destructive hover:text-destructive'
                      : 'text-success hover:text-success'
                  }
                  onClick={() => setToggleTarget(row.original)}
                >
                  {row.original.isActive ? (
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
        ] satisfies ColumnDef<AdminUser>[])
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Admin panel access control"
        actions={
          <Can permission="users.write">
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="size-4" /> Invite user
            </Button>
          </Can>
        }
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            className="max-w-sm"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(v) => setSearch({ search: v || undefined })}
          />
          <OptionSelect
            value={role}
            onChange={(v) => setSearch({ role: v })}
            options={ROLE_OPTIONS}
            allLabel="All roles"
          />
        </div>
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isPending}
          error={query.isError}
          onRetry={() => void query.refetch()}
          pagination={{
            page,
            pageSize: DEFAULT_PAGE_SIZE,
            total: query.data?.totalCount ?? 0,
            onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
          }}
          emptyState={{ title: 'No users' }}
        />
      </SectionCard>

      <Dialog open={inviteOpen} onOpenChange={(open) => (open ? setInviteOpen(true) : closeInvite())}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>Create an admin panel account with an initial password.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              inviteUser.mutate(values, { onSuccess: closeInvite }),
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" error={errors.firstName?.message}>
                <Input {...form.register('firstName')} />
              </FormField>
              <FormField label="Last name" error={errors.lastName?.message}>
                <Input {...form.register('lastName')} />
              </FormField>
            </div>
            <FormField label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="user@example.com" {...form.register('email')} />
            </FormField>
            <FormField label="Phone number" error={errors.phoneNumber?.message}>
              <Input type="tel" placeholder="+995 5XX XXX XXX" {...form.register('phoneNumber')} />
            </FormField>
            <FormField label="Password" error={errors.password?.message}>
              <Input type="password" autoComplete="new-password" {...form.register('password')} />
            </FormField>
            <FormField label="Role">
              <OptionSelect
                value={form.watch('role')}
                onChange={(v) => v && form.setValue('role', v)}
                options={ROLE_OPTIONS}
                className="w-full"
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeInvite}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteUser.isPending}>
                {inviteUser.isPending ? 'Inviting…' : 'Invite user'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(roleTarget)}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        title={`Change role for ${roleTarget ? fullName(roleTarget.user) : ''}?`}
        description={
          roleTarget
            ? `${ROLE_LABELS[roleTarget.user.role] ?? roleTarget.user.role} → ${ROLE_LABELS[roleTarget.next]}.`
            : undefined
        }
        confirmLabel="Change role"
        pending={changeRole.isPending}
        onConfirm={() => {
          if (!roleTarget) return;
          changeRole.mutate(
            { id: roleTarget.user.id, role: roleTarget.next },
            { onSettled: () => setRoleTarget(null) },
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={
          toggleTarget
            ? `${toggleTarget.isActive ? 'Disable' : 'Enable'} ${fullName(toggleTarget)}?`
            : ''
        }
        description={
          toggleTarget?.isActive
            ? 'The user will immediately lose access to the admin panel.'
            : 'The user will regain access with their current role.'
        }
        confirmLabel={toggleTarget?.isActive ? 'Disable user' : 'Enable user'}
        destructive={toggleTarget?.isActive}
        pending={toggleStatus.isPending}
        onConfirm={() => {
          if (!toggleTarget) return;
          toggleStatus.mutate(
            { id: toggleTarget.id, isActive: !toggleTarget.isActive },
            { onSettled: () => setToggleTarget(null) },
          );
        }}
      />
    </>
  );
}
