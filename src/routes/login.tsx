import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Fingerprint, KeyRound, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type { AdminUser } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginPage,
});

const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type Credentials = z.infer<typeof credentialsSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (values: Credentials) => api.post<{ requiresOtp: boolean }>('/auth/login', values),
    onSuccess: (_, values) => {
      setEmail(values.email);
      setStep('otp');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? 'Invalid email or password' : 'Login failed');
    },
  });

  const verify = useMutation({
    mutationFn: (code: string) =>
      api.post<{ token: string; user: AdminUser }>('/auth/verify-otp', { email, code }),
    onSuccess: ({ token, user }) => {
      setSession(token, user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      void navigate({ to: redirect && redirect.startsWith('/') ? redirect : '/' });
    },
    onError: () => toast.error('Invalid verification code'),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-card border border-border">
            <Fingerprint className="size-7 text-info" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">MULTIPAY</h1>
          <p className="mt-1 text-sm text-muted-foreground">Palm Pay Administration</p>
        </div>

        {sessionExpired && (
          <Alert className="border-warning/40 bg-warning/10">
            <AlertTitle className="text-warning">Your session expired</AlertTitle>
            <AlertDescription>Please sign in again to continue.</AlertDescription>
          </Alert>
        )}

        <Card className="rounded-2xl p-6">
          {step === 'credentials' ? (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => login.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@multipay.ge"
                  autoComplete="email"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending && <Loader2 className="size-4 animate-spin" />}
                Continue
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo: <span className="font-mono">admin@multipay.ge / palmpay123</span>
              </p>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (otp.length === 6) verify.mutate(otp);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-card-elevated">
                  <KeyRound className="size-5 text-info" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              </div>
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center font-mono text-xl tracking-[0.5em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <Button type="submit" className="w-full" disabled={otp.length !== 6 || verify.isPending}>
                {verify.isPending && <Loader2 className="size-4 animate-spin" />}
                Verify & sign in
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setStep('credentials');
                  setOtp('');
                }}
              >
                Back to login
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Demo code: <span className="font-mono">000000</span>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
