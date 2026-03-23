'use client';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;

    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Invalidate shift queries on schedule changes
    socket.on('schedule:published', () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    });

    socket.on('schedule:updated', () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    });

    socket.on('assignment:created', () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    });

    socket.on('swap:status_changed', () => {
      qc.invalidateQueries({ queryKey: ['my-swaps'] });
      qc.invalidateQueries({ queryKey: ['all-swaps'] });
    });

    socket.on('swap:requested', () => {
      qc.invalidateQueries({ queryKey: ['all-swaps'] });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('schedule:published');
      socket.off('schedule:updated');
      socket.off('assignment:created');
      socket.off('swap:status_changed');
      socket.off('swap:requested');
    };
  }, [qc]);

  // connected state is tracked but used implicitly via socket events
  void connected;

  return <>{children}</>;
}
