import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CreditCard, Store, TabletSmartphone, UserRound } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatGEL } from '@/lib/format';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { StatusText } from '@/components/shared/StatusText';

interface SearchResults {
  merchants: { id: string; name: string; status: string }[];
  terminals: { id: string; location: string; status: string }[];
  transactions: { id: string; amount: number; status: string }[];
  users: { id: string; name: string; email: string }[];
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const { data } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<SearchResults>('/search', { q: query }),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
  });

  const go = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    setQuery('');
    void navigate({ to, params } as never);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Search merchant, transaction, user..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.length < 2 ? 'Type at least 2 characters to search.' : 'No results found.'}
        </CommandEmpty>
        {(data?.merchants.length ?? 0) > 0 && (
          <CommandGroup heading="Merchants">
            {data?.merchants.map((m) => (
              <CommandItem
                key={m.id}
                value={`merchant-${m.id}`}
                onSelect={() => go('/merchants/$merchantId', { merchantId: m.id })}
              >
                <Store className="size-4" />
                <span className="flex-1">{m.name}</span>
                <StatusText status={m.status} className="text-xs" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(data?.terminals.length ?? 0) > 0 && (
          <CommandGroup heading="Terminals">
            {data?.terminals.map((t) => (
              <CommandItem
                key={t.id}
                value={`terminal-${t.id}`}
                onSelect={() => go('/terminals/$terminalId', { terminalId: t.id })}
              >
                <TabletSmartphone className="size-4" />
                <span className="font-medium">{t.id}</span>
                <span className="flex-1 truncate text-muted-foreground">{t.location}</span>
                <StatusText status={t.status} className="text-xs" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(data?.transactions.length ?? 0) > 0 && (
          <CommandGroup heading="Transactions">
            {data?.transactions.map((t) => (
              <CommandItem
                key={t.id}
                value={`tx-${t.id}`}
                onSelect={() => go('/transactions')}
              >
                <CreditCard className="size-4" />
                <span className="flex-1 font-medium">{t.id}</span>
                <span className="text-muted-foreground">{formatGEL(t.amount)}</span>
                <StatusText status={t.status} className="text-xs" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(data?.users.length ?? 0) > 0 && (
          <CommandGroup heading="Users">
            {data?.users.map((u) => (
              <CommandItem key={u.id} value={`user-${u.id}`} onSelect={() => go('/users')}>
                <UserRound className="size-4" />
                <span className="flex-1">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
