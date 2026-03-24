'use client';
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

export function useSocket() {
  const [socket] = useState<Socket | null>(() => {
    // Only initialize on client
    if (typeof window !== 'undefined') {
      return getSocket();
    }
    return null;
  });

  return socket ?? getSocket();
}

export function useSocketEvent(event: string, handler: (data: unknown) => void) {
  const socket = useSocket();

  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
