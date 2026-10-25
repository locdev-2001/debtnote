import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { apiClient } from '../../lib/rpc';

export function useLedger(ownerId: string) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [issue, setIssue] = useState('');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const snapshot = useQuery({
    queryKey: ['ledger', ownerId],
    queryFn: () => apiClient.ledger.snapshot.query(),
    refetchInterval: 5_000,
  });
  async function perform<Result>(operation: () => Promise<Result>, message = 'Đã lưu.') {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setPending(true);
    setIssue('');
    setNotice('');
    try {
      const result = await operation();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ledger', ownerId] }),
        queryClient.invalidateQueries({ queryKey: ['links', ownerId] }),
        queryClient.invalidateQueries({ queryKey: ['settings', ownerId] }),
      ]);
      setNotice(message);
      return result;
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Chưa lưu được.');
      return undefined;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return { snapshot, notice, issue, pending, perform, setNotice, setIssue };
}
