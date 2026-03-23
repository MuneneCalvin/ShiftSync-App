'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { getStoredUser } from '@/lib/auth';
import { Shift, SwapRequest } from '@/lib/types';
import { ArrowLeftRight, X, Loader2 } from 'lucide-react';

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

function SwapRequestModal({ shifts, onClose, onCreated }: {
  shifts: Shift[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<'SWAP' | 'DROP'>('SWAP');
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? '');
  const [targetUserId, setTargetUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      await api.post('/swaps', { type, shiftId, ...(type === 'SWAP' ? { targetUserId } : {}) });
      onCreated(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Failed to submit request.');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">New Swap / Drop Request</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-3">
              {(['SWAP', 'DROP'] as const).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:border-blue-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.location?.name} · {fmt(s.startTime, s.location?.timezone ?? 'UTC')}
                </option>
              ))}
            </select>
          </div>
          {type === 'SWAP' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Staff User ID</label>
              <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user ID to swap with…"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {type === 'DROP' && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              A DROP request will be open for any qualified staff to pick up. It expires 24 hours before the shift starts.
            </p>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || (type === 'SWAP' && !targetUserId)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

function MyShiftsContent() {
  const user = getStoredUser();
  const [showModal, setShowModal] = useState(false);

  // Fetch user profile with assignments
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/users/me').then((r) => r.data),
    enabled: !!user,
  });

  const { data: mySwaps, refetch: refetchSwaps } = useQuery<SwapRequest[]>({
    queryKey: ['my-swaps'],
    queryFn: () => api.get('/swaps').then((r) => r.data),
    enabled: !!user,
  });

  async function handleCancel(swapId: string) {
    await api.patch(`/swaps/${swapId}/cancel`);
    refetchSwaps();
  }

  async function handleAccept(swapId: string) {
    await api.patch(`/swaps/${swapId}/accept`);
    refetchSwaps();
  }

  const upcomingShifts: Shift[] = (profile?.assignments ?? []).map((a: { shift: Shift & { location: { name: string; timezone: string } } }) => ({
    ...a.shift,
    location: a.shift?.location,
  })).filter(Boolean) as Shift[];

  // Incoming swap requests where I'm the target
  const incomingSwaps = mySwaps?.filter(
    (s) => s.targetUserId === user?.id && s.status === 'PENDING'
  ) ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Shifts</h1>
        <button onClick={() => setShowModal(true)}
          disabled={!upcomingShifts.length}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40">
          <ArrowLeftRight className="w-4 h-4" /> Request Swap / Drop
        </button>
      </div>

      {/* Assigned Shifts */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming Assignments</h2>
        {!upcomingShifts.length ? (
          <p className="text-gray-400 text-sm">No upcoming shifts assigned.</p>
        ) : (
          <div className="space-y-3">
            {upcomingShifts.map((shift) => (
              <div key={shift.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{shift.location?.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {shift.location ? fmt(shift.startTime, shift.location.timezone) : shift.startTime}
                    {' · '}
                    <span className="text-blue-600 font-medium">{shift.requiredSkill}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Incoming swap requests (I'm the target) */}
      {incomingSwaps.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Incoming Swap Requests</h2>
          <div className="space-y-3">
            {incomingSwaps.map((swap) => (
              <div key={swap.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-900">
                  {swap.requester.name} wants to swap their shift with you
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {swap.shift.location.name} · {fmt(swap.shift.startTime, swap.shift.location.timezone)}
                </p>
                <button onClick={() => handleAccept(swap.id)}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition">
                  Accept Swap
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My swap requests */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Requests</h2>
        {!mySwaps?.length ? (
          <p className="text-gray-400 text-sm">No swap or drop requests.</p>
        ) : (
          <div className="space-y-3">
            {mySwaps.map((swap) => (
              <div key={swap.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{swap.type}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[swap.status]}`}>{swap.status}</span>
                  </div>
                  {['PENDING', 'ACCEPTED'].includes(swap.status) && swap.requesterId === user?.id && (
                    <button onClick={() => handleCancel(swap.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 mt-2">
                  {swap.shift.location.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fmt(swap.shift.startTime, swap.shift.location.timezone)}
                  {swap.targetUser && ` · with ${swap.targetUser.name}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && upcomingShifts.length > 0 && (
        <SwapRequestModal
          shifts={upcomingShifts}
          onClose={() => setShowModal(false)}
          onCreated={() => refetchSwaps()}
        />
      )}
    </div>
  );
}

export default function MyShiftsPage() {
  return (
    <AuthGuard>
      <Navbar />
      <MyShiftsContent />
    </AuthGuard>
  );
}
