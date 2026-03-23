'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { SwapRequest } from '@/lib/types';
import { ViolationBanner } from '@/components/ViolationBanner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function fmt(iso: string, tz: string) {
  const d = toZonedTime(new Date(iso), tz);
  return format(d, 'EEE MMM d, h:mm a');
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  MANAGER_REVIEW: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-red-100 text-red-700',
};

export default function SwapsPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, { success: boolean; message?: string; violations?: { rule: string; message: string; severity: 'BLOCK' | 'WARN' }[] }>>({});

  const { data: swaps, refetch } = useQuery<SwapRequest[]>({
    queryKey: ['all-swaps'],
    queryFn: () => api.get('/swaps').then((r) => r.data),
  });

  async function handleApprove(swapId: string) {
    setActionLoading(swapId);
    try {
      const { data } = await api.patch(`/swaps/${swapId}/approve`);
      setActionResults((prev) => ({ ...prev, [swapId]: data as { success: boolean; message?: string; violations?: { rule: string; message: string; severity: 'BLOCK' | 'WARN' }[] } }));
      if ((data as { success: boolean }).success) refetch();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(swapId: string) {
    setActionLoading(swapId);
    try {
      await api.patch(`/swaps/${swapId}/reject`);
      refetch();
    } finally {
      setActionLoading(null);
    }
  }

  const pending = swaps?.filter((s) => s.status === 'MANAGER_REVIEW') ?? [];
  const others = swaps?.filter((s) => s.status !== 'MANAGER_REVIEW') ?? [];

  return (
    <AuthGuard>
      <Navbar />
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Swap &amp; Drop Requests</h1>

        {/* Pending Manager Review */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Awaiting Review ({pending.length})
          </h2>
          {!pending.length ? (
            <p className="text-gray-400 text-sm">No requests awaiting review.</p>
          ) : (
            <div className="space-y-4">
              {pending.map((swap) => {
                const result = actionResults[swap.id];
                return (
                  <div key={swap.id} className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-full">{swap.type}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[swap.status]}`}>{swap.status}</span>
                        </div>
                        <p className="font-semibold text-gray-900">{swap.shift.location.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {fmt(swap.shift.startTime, swap.shift.location.timezone)} · <span className="text-blue-600">{swap.shift.requiredSkill}</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">{swap.requester.name}</span>
                          {swap.targetUser && <> &rarr; <span className="font-medium">{swap.targetUser.name}</span></>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(swap.id)}
                          disabled={actionLoading === swap.id}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          {actionLoading === swap.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(swap.id)}
                          disabled={actionLoading === swap.id}
                          className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </div>
                    {result && !result.success && (
                      <div className="mt-3">
                        <p className="text-sm text-red-600 font-medium mb-1">{result.message}</p>
                        <ViolationBanner violations={result.violations ?? []} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* All other requests */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">All Requests</h2>
          {!others.length ? (
            <p className="text-gray-400 text-sm">No other requests.</p>
          ) : (
            <div className="space-y-2">
              {others.map((swap) => (
                <div key={swap.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{swap.type}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[swap.status]}`}>{swap.status}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{swap.shift.location.name}</p>
                    <p className="text-xs text-gray-500">
                      {fmt(swap.shift.startTime, swap.shift.location.timezone)} · {swap.requester.name}
                      {swap.targetUser && ` \u2192 ${swap.targetUser.name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
