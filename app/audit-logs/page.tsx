'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Location } from '@/lib/types';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
  note: string | null;
  before: unknown;
  after: unknown;
  actor: { id: string; name: string; email: string; role: string };
  shift: { id: string; requiredSkill: string; startTime: string; location: { name: string } } | null;
  swap: { id: string; type: string; status: string } | null;
}

const ACTION_COLOR: Record<string, string> = {
  SHIFT_CREATED: 'bg-blue-100 text-blue-700',
  SHIFT_PUBLISHED: 'bg-green-100 text-green-700',
  SHIFT_EDITED: 'bg-yellow-100 text-yellow-700',
  ASSIGNMENT_CREATED: 'bg-indigo-100 text-indigo-700',
  ASSIGNMENT_DELETED: 'bg-red-100 text-red-700',
  OVERTIME_OVERRIDE: 'bg-orange-100 text-orange-700',
  SWAP_CREATED: 'bg-purple-100 text-purple-700',
  SWAP_ACCEPTED: 'bg-teal-100 text-teal-700',
  SWAP_APPROVED: 'bg-green-100 text-green-700',
  SWAP_CANCELLED: 'bg-gray-100 text-gray-600',
  SWAP_REJECTED: 'bg-red-100 text-red-700',
  DROP_PICKED_UP: 'bg-cyan-100 text-cyan-700',
};

const LIMIT = 25;

function AuditLogsContent() {
  const [offset, setOffset] = useState(0);
  const [locationId, setLocationId] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  });

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ['audit-logs', locationId, action, offset, appliedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (locationId) params.set('locationId', locationId);
      if (action) params.set('action', action);
      return api.get(`/audit-logs?${params}`).then((r) => r.data);
    },
  });

  const logs = (data?.logs ?? []).filter((l) => {
    if (!appliedSearch) return true;
    const q = appliedSearch.toLowerCase();
    return (
      l.actor.name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.shift?.location.name.toLowerCase().includes(q) ||
      false
    );
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  function handleFilter() {
    setAppliedSearch(search);
    setOffset(0);
  }

  function handleReset() {
    setLocationId('');
    setAction('');
    setSearch('');
    setAppliedSearch('');
    setOffset(0);
  }

  const allActions = [
    'SHIFT_CREATED', 'SHIFT_PUBLISHED', 'SHIFT_EDITED',
    'ASSIGNMENT_CREATED', 'ASSIGNMENT_DELETED', 'OVERTIME_OVERRIDE',
    'SWAP_CREATED', 'SWAP_ACCEPTED', 'SWAP_APPROVED',
    'SWAP_CANCELLED', 'SWAP_REJECTED', 'DROP_PICKED_UP',
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">Full history of all scheduling actions</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
          <select value={locationId} onChange={(e) => { setLocationId(e.target.value); setOffset(0); }}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All locations</option>
            {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
          <select value={action} onChange={(e) => { setAction(e.target.value); setOffset(0); }}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All actions</option>
            {allActions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Search actor / location</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
            placeholder="Type to search…"
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={handleFilter}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">
          <Search className="w-3.5 h-3.5" /> Apply
        </button>
        <button onClick={handleReset}
          className="px-4 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-800 border border-gray-200 transition">
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-gray-400 p-6">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 italic p-6">No audit log entries found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Actor</th>
                <th className="text-left px-4 py-3 font-semibold">Context</th>
                <th className="text-left px-4 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{log.actor.name}</p>
                    <p className="text-[10px] text-gray-400">{log.actor.role}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {log.shift && (
                      <span>{log.shift.location.name} · <span className="font-medium text-blue-600">{log.shift.requiredSkill}</span></span>
                    )}
                    {log.swap && (
                      <span className="text-purple-600">{log.swap.type} · {log.swap.status}</span>
                    )}
                    {!log.shift && !log.swap && '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs italic">
                    {log.note ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{total} total entries · Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button disabled={offset + LIMIT >= total}
              onClick={() => setOffset(offset + LIMIT)}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <AuthGuard>
      <Navbar />
      <AuditLogsContent />
    </AuthGuard>
  );
}
