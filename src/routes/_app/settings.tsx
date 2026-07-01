import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Plus, QrCode, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, API_BASE_URL, USE_MOCK } from '@/lib/api-client';
import type { ApiKey } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Can } from '@/components/shared/Can';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDateTime, formatTimeAgo } from '@/lib/format';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Profile, security and platform configuration" />
      <Tabs defaultValue="profile" className="gap-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg">Profile</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">Notifications</TabsTrigger>
          <Can permission="api_keys.manage">
            <TabsTrigger value="api" className="rounded-lg">API & Integrations</TabsTrigger>
          </Can>
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <Can permission="api_keys.manage">
          <TabsContent value="api"><ApiTab /></TabsContent>
        </Can>
      </Tabs>
    </>
  );
}

function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/settings/profile', { name, email }),
    onSuccess: () => toast.success('Profile updated'),
    onError: () => toast.error('Failed to update profile'),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post('/settings/change-password', { currentPw, newPw }),
    onSuccess: () => {
      toast.success('Password changed');
      setCurrentPw('');
      setNewPw('');
    },
    onError: () => toast.error('Failed to change password'),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">Profile</h3>
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button
          className="w-fit"
          onClick={() => saveProfile.mutate()}
          disabled={saveProfile.isPending}
        >
          Save profile
        </Button>
      </Card>

      <Card className="gap-4 rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">Change password</h3>
        <div className="space-y-1.5">
          <Label>Current password</Label>
          <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        </div>
        <Button
          className="w-fit"
          variant="outline"
          disabled={!currentPw || newPw.length < 8 || changePassword.isPending}
          onClick={() => changePassword.mutate()}
        >
          <KeyRound className="size-4" /> Change password
        </Button>
        {newPw.length > 0 && newPw.length < 8 && (
          <p className="text-xs text-destructive">New password must be at least 8 characters.</p>
        )}
      </Card>
    </div>
  );
}

function SecurityTab() {
  const user = useAuthStore((s) => s.user);
  const timeoutMinutes = useUiStore((s) => s.sessionTimeoutMinutes);
  const setTimeoutMinutes = useUiStore((s) => s.setSessionTimeoutMinutes);
  const [twoFa, setTwoFa] = useState(user?.twoFactorEnabled ?? true);
  const [otpDialog, setOtpDialog] = useState(false);
  const [otp, setOtp] = useState('');

  const toggle2fa = useMutation({
    mutationFn: ({ enabled, code }: { enabled: boolean; code?: string }) =>
      api.post('/settings/2fa', { enabled, code }),
    onSuccess: (_, { enabled }) => {
      setTwoFa(enabled);
      setOtpDialog(false);
      setOtp('');
      toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
    },
    onError: () => toast.error('Invalid confirmation code'),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Two-factor authentication</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Require a one-time code from an authenticator app at sign-in.
            </p>
          </div>
          <Switch
            checked={twoFa}
            onCheckedChange={(checked) => {
              if (checked) setOtpDialog(true);
              else toggle2fa.mutate({ enabled: false });
            }}
          />
        </div>
        {twoFa && (
          <p className="inline-flex items-center gap-2 text-sm text-success">
            <ShieldCheck className="size-4" /> 2FA is active on your account
          </p>
        )}
      </Card>

      <Card className="gap-4 rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">Session timeout</h3>
        <p className="text-sm text-muted-foreground">
          Automatically log out after a period of inactivity.
        </p>
        <Select
          value={String(timeoutMinutes)}
          onValueChange={(v) => {
            setTimeoutMinutes(Number(v));
            toast.success(`Session timeout set to ${v} minutes`);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 15, 30, 60].map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m} minutes
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <ConfirmDialog
        open={otpDialog}
        onOpenChange={setOtpDialog}
        title="Enable two-factor authentication"
        description={
          <span className="block space-y-4 pt-2">
            <span className="mx-auto flex size-36 items-center justify-center rounded-xl border border-border bg-card-elevated">
              <QrCode className="size-20 text-muted-foreground" />
            </span>
            <span className="block text-center text-xs text-muted-foreground">
              Scan with your authenticator app, then enter the 6-digit code (demo: 000000)
            </span>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="text-center font-mono tracking-[0.4em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </span>
        }
        confirmLabel="Verify & enable"
        pending={toggle2fa.isPending}
        onConfirm={() => toggle2fa.mutate({ enabled: true, code: otp })}
      />
    </div>
  );
}

function NotificationsTab() {
  const prefs = useUiStore((s) => s.notificationPrefs);
  const setPref = useUiStore((s) => s.setNotificationPref);

  const items = [
    {
      key: 'email' as const,
      title: 'Email notifications',
      description: 'Daily summary and account notifications by email',
    },
    {
      key: 'criticalAlerts' as const,
      title: 'Critical alerts',
      description: 'Immediate notification for fraud and outage alerts',
    },
    {
      key: 'weeklyDigest' as const,
      title: 'Weekly digest',
      description: 'Weekly turnover and performance report every Monday',
    },
  ];

  return (
    <Card className="gap-1 rounded-2xl p-6 lg:max-w-2xl">
      <h3 className="mb-3 font-semibold text-foreground">Notification preferences</h3>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              checked={prefs[item.key]}
              onCheckedChange={(checked) => {
                setPref(item.key, checked);
                toast.success('Preference saved');
              }}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ApiTab() {
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('https://example.ge/webhooks/palmpay');

  const keys = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKey[]>('/settings/api-keys'),
  });

  const createKey = useMutation({
    mutationFn: (name: string) => api.post<ApiKey & { secret: string }>('/settings/api-keys', { name }),
    onSuccess: (key) => {
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setCreatedSecret(key.secret);
      setNewKeyName('');
      toast.success('API key created');
    },
    onError: () => toast.error('Failed to create key'),
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => api.patch(`/settings/api-keys/${id}`, { revoked: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked');
    },
    onError: () => toast.error('Failed to revoke key'),
  });

  return (
    <div className="space-y-4">
      <Card className="gap-4 rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">REST API configuration</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>API base URL</Label>
            <Input value={API_BASE_URL} readOnly className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">
              {USE_MOCK
                ? 'Currently serving local mock JSON. Set VITE_USE_MOCK=false and VITE_API_BASE_URL in .env to connect the real backend.'
                : 'Connected to live backend.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={() => toast.success('Webhook URL saved')}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="gap-4 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">API keys</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g. Reporting)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-56"
            />
            <Button
              disabled={newKeyName.length < 3 || createKey.isPending}
              onClick={() => createKey.mutate(newKeyName)}
            >
              <Plus className="size-4" /> Create key
            </Button>
          </div>
        </div>

        {createdSecret && (
          <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-success">Copy your new key now</p>
              <p className="truncate font-mono text-sm text-foreground">{createdSecret}</p>
              <p className="text-xs text-muted-foreground">It will not be shown again.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(createdSecret);
                toast.success('Copied to clipboard');
              }}
            >
              <Copy className="size-4" /> Copy
            </Button>
          </div>
        )}

        {keys.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ul className="space-y-2">
            {(keys.data ?? []).map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-card-elevated px-4 py-3"
              >
                <span className="font-mono text-sm text-info">{key.prefix}…</span>
                <span className="font-medium text-foreground">{key.name}</span>
                {key.revoked && (
                  <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                    revoked
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  created {formatDateTime(key.createdAt)} · last used{' '}
                  {key.lastUsedAt ? formatTimeAgo(key.lastUsedAt) : 'never'}
                </span>
                {!key.revoked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRevokeTarget(key)}
                  >
                    <Trash2 className="size-4" /> Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title={`Revoke "${revokeTarget?.name}"?`}
        description="Integrations using this key will immediately stop working. This cannot be undone."
        confirmLabel="Revoke key"
        destructive
        pending={revokeKey.isPending}
        onConfirm={() => {
          if (!revokeTarget) return;
          revokeKey.mutate(revokeTarget.id, { onSettled: () => setRevokeTarget(null) });
        }}
      />
    </div>
  );
}
