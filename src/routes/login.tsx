import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Fingerprint, Loader2 } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type { LoginResponse } from '@/types';
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
  password: z.string().min(1, 'Password is required'),
});

type Credentials = z.infer<typeof credentialsSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const setSession = useAuthStore((s) => s.setSession);

  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (values: Credentials) => api.post<LoginResponse>('/auth/login', values),
    onSuccess: ({ token, email, role }) => {
      setSession(token, { email, role });
      toast.success(`Welcome back, ${email}`);
      void navigate({ to: redirect && redirect.startsWith('/') ? redirect : '/' });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError && err.status === 401
          ? 'Invalid email or password'
          : errorMessage(err, 'Login failed'),
      );
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-card border border-border">
            <Fingerprint className="size-7 text-info" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">PALM PAY</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administration</p>
        </div>

        {sessionExpired && (
          <Alert className="border-warning/40 bg-warning/10">
            <AlertTitle className="text-warning">Your session expired</AlertTitle>
            <AlertDescription>Please sign in again to continue.</AlertDescription>
          </Alert>
        )}

        <Card className="rounded-2xl p-6">
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => login.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
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
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
