'use client';
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { AlertTriangle, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'warning' | 'error';
}

export function ConflictToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const socket = useSocket();
  const nextIdRef = useRef(0);

  useEffect(() => {
    function addToast(message: string, type: Toast['type']) {
      const id = ++nextIdRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    }

    socket.on('conflict:concurrent', (data: { message: string }) => {
      addToast(data.message, 'error');
    });

    socket.on('overtime:warning', (data: { userId: string; projectedWeeklyHours: number }) => {
      addToast(`Overtime warning: staff member will reach ${data.projectedWeeklyHours}hr this week.`, 'warning');
    });

    return () => {
      socket.off('conflict:concurrent');
      socket.off('overtime:warning');
    };
  }, [socket]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl text-sm max-w-sm ${
            t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-yellow-500 text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
