'use client';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      // Don't disconnect on unmount — keep connection alive across pages
    };
  }, []);

  return socketRef.current ?? getSocket();
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
