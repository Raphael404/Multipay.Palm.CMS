import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/api-client';

/**
 * useMutation with the app's standard side effects: invalidate the given
 * query keys and show a success / error toast.
 */
export function useApiMutation<TData, TVars = void>({
  mutationFn,
  invalidate = [],
  success,
  error,
}: {
  mutationFn: (vars: TVars) => Promise<TData>;
  invalidate?: QueryKey[];
  success?: string | ((data: TData, vars: TVars) => string);
  error: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      for (const queryKey of invalidate) void queryClient.invalidateQueries({ queryKey });
      if (success) toast.success(typeof success === 'function' ? success(data, vars) : success);
    },
    onError: (err) => toast.error(errorMessage(err, error)),
  });
}
