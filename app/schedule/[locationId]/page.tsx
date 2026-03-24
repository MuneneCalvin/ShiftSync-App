'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { ViolationBanner } from '@/components/ViolationBanner';
import { Location, Shift, ConstraintResult, Suggestion } from '@/lib/types';
import { getCurrentWeekOf, addWeeksToISO, formatWeekLabel, formatShiftTime } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, CheckCircle, XCircle, Loader2 } from 'lucide-react';

// ── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({
  shift,
  location,
  onClose,
  onAssigned,
}: {
  shift: Shift;
  location: Location;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [checking, setChecking] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [checkResult, setCheckResult] = useState<ConstraintResult | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [assignError, setAssignError] = useState('');

  async function handleCheck() {
    if (!userId.trim()) return;
    setChecking(true);
    setCheckResult(null);
    setAssignError('');
    try {
      const { data } = await api.get(`/shifts/${shift.id}/check`, { params: { userId } });
      setCheckResult(data);
    } finally {
      setChecking(false);
    }
  }

  async function handleAssign() {
    setAssigning(true);
    setAssignError('');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { userId };
      const needsOvertimeOverride = checkResult?.violations.some(
        (v) => v.rule === 'OVERTIME' && v.severity === 'BLOCK'
      );
      if (needsOvertimeOverride && overrideReason) body.overrideOvertimeReason = overrideReason;

      const { data } = await api.post(`/shifts/${shift.id}/assign`, body);
      if (data.success) {
        onAssigned();
        onClose();
      } else {
        setCheckResult(data);
        setAssignError('Assignment blocked by constraint violations.');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setAssignError(axiosErr.response?.data?.message ?? 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  }

  function handleSuggestion(suggestion: Suggestion) {
    setUserId(suggestion.userId);
    setCheckResult(null);
    setOverrideReason('');
  }

  const needsOvertimeOverride = checkResult?.violations.some(
    (v) => v.rule === 'OVERTIME' && v.severity === 'BLOCK'
  );
  const canAssign = checkResult?.allowed || (needsOvertimeOverride && overrideReason.trim().length > 0);

  return (
    <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 opacity-100 transition-opacity duration-300">
      <div className="bg-white rounded-[24px] shadow-premium-hover border border-white/20 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col transform transition-transform duration-300 scale-100">
        <div className="px-6 py-5 border-b border-surface-100 bg-surface-50/50">
          <h2 className="text-xl font-bold text-surface-900 tracking-tight">Assign Staff</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
              {shift.requiredSkill}
            </span>
            <span className="text-sm font-medium text-surface-500">
              {formatShiftTime(shift.startTime, location.timezone)}–{formatShiftTime(shift.endTime, location.timezone)} · {location.name}
            </span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-surface-700">Staff User ID</label>
            <div className="flex gap-2">
              <input
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setCheckResult(null); }}
                placeholder="Enter staff user ID…"
                className="flex-1 bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200"
              />
              <button
                onClick={handleCheck}
                disabled={!userId.trim() || checking}
                className="bg-surface-100 hover:bg-surface-200 text-surface-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 border border-surface-200"
              >
                {checking && <Loader2 className="w-4 h-4 animate-spin" />}
                Check
              </button>
            </div>
          </div>

          {checkResult && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className={`flex items-center gap-2 text-sm font-semibold mb-3 px-3 py-2 rounded-lg border ${checkResult.allowed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {checkResult.allowed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {checkResult.allowed ? 'All constraints pass' : 'Constraint violations found'}
                {checkResult.projectedWeeklyHours !== undefined && (
                  <span className="ml-auto text-surface-500 font-medium text-xs bg-white/50 px-2 py-0.5 rounded-md">{checkResult.projectedWeeklyHours}hr projected this week</span>
                )}
              </div>
              
              <div className="mb-4">
                <ViolationBanner violations={checkResult.violations} />
              </div>

              {needsOvertimeOverride && (
                <div className="space-y-1.5 p-4 bg-orange-50/50 border border-orange-200 rounded-xl mb-4">
                  <label className="flex text-sm font-semibold text-orange-800 items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Override Reason (required for overtime block)
                  </label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why this overtime is necessary…"
                    rows={2}
                    className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>
              )}

              {checkResult.suggestions.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-surface-500 pl-1">Suggested Alternatives</p>
                  <div className="space-y-2">
                    {checkResult.suggestions.map((s) => (
                      <button
                        key={s.userId}
                        onClick={() => handleSuggestion(s)}
                        className="w-full text-left bg-white border border-surface-200 rounded-xl px-4 py-3 text-sm hover:border-brand-300 hover:shadow-sm transition-all group overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-brand-50/0 group-hover:bg-brand-50/30 transition-colors pointer-events-none" />
                        <div className="relative z-10 flex flex-col gap-1">
                          <span className="font-semibold text-surface-900 group-hover:text-brand-700 transition-colors">{s.name}</span>
                          <span className="text-surface-500 font-medium text-xs">{s.reason}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {assignError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
               <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
               <span>{assignError}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-surface-100 bg-surface-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!checkResult || !canAssign || assigning}
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-premium hover:shadow-premium-hover transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {assigning && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Shift Modal ─────────────────────────────────────────────────────────
function CreateShiftModal({
  locationId,
  weekOf,
  onClose,
  onCreated,
}: {
  locationId: string;
  weekOf: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [skill, setSkill] = useState('bartender');
  const [headcount, setHeadcount] = useState(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!startTime || !endTime) { setError('Start and end time required.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/shifts', {
        locationId,
        requiredSkill: skill,
        headcount,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        weekOf,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? 'Failed to create shift.');
    } finally {
      setLoading(false);
    }
  }

  const skills = ['bartender', 'server', 'host', 'line cook'];

  return (
    <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-100 transition-opacity duration-300">
      <div className="bg-white rounded-[24px] shadow-premium-hover border border-white/20 w-full max-w-md flex flex-col transform transition-transform duration-300 scale-100">
        <div className="px-6 py-5 border-b border-surface-100 bg-surface-50/50 rounded-t-[24px]">
          <h2 className="text-xl font-bold text-surface-900 tracking-tight">Create Shift</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-surface-700">Required Skill</label>
            <div className="relative">
              <select value={skill} onChange={(e) => setSkill(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200 appearance-none">
                {skills.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-surface-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-surface-700">Headcount</label>
            <input type="number" min={1} max={10} value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-surface-700">Start Time</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-surface-700">End Time</label>
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200" />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
               <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
               <span>{error}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-surface-100 bg-surface-50/50 flex justify-end gap-3 rounded-b-[24px]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-premium hover:shadow-premium-hover transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={3} />}
            {loading ? 'Creating…' : 'Create Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shift Card ────────────────────────────────────────────────────────────────
function ShiftCard({ shift, location, onAssign, onUnassign, onPublish }: {
  shift: Shift;
  location: Location;
  onAssign: (shift: Shift) => void;
  onUnassign: (shiftId: string, userId: string) => void;
  onPublish: (shiftId: string) => void;
}) {
  const isFull = shift.assignments.length >= shift.headcount;

  return (
    <div className={`group bg-white border rounded-[16px] p-4 shadow-sm hover:shadow-premium transition-all duration-200 relative overflow-hidden ${shift.published ? 'border-green-200/60 hover:border-green-300' : 'border-surface-200/60 hover:border-brand-300'}`}>
      {/* Optional accent strip */}
      {!shift.published && <div className="absolute left-0 top-0 bottom-0 w-1 bg-surface-200 group-hover:bg-brand-400 transition-colors" />}
      {shift.published && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-400" />}

      <div className="flex items-start justify-between mb-2.5 pl-1.5">
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
            {shift.requiredSkill}
          </span>
          {shift.published && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">Published</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-surface-50 px-2 py-0.5 rounded-md border border-surface-200">
          <span className="text-[10px] font-semibold text-surface-600">{shift.assignments.length}/{shift.headcount}</span>
          <div className="flex -space-x-1">
            {/* Visual indicator of fill level */}
            {Array.from({ length: shift.headcount }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full border border-white ${i < shift.assignments.length ? 'bg-brand-500' : 'bg-surface-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold text-surface-900 mb-4 pl-1.5 flex items-center gap-1.5">
        <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatShiftTime(shift.startTime, location.timezone)} – {formatShiftTime(shift.endTime, location.timezone)}
      </p>

      <div className="space-y-1.5 mb-4 pl-1.5">
        {shift.assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-surface-50 border border-surface-200/50 rounded-lg px-2.5 py-1.5 group/assignment hover:bg-surface-100 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold">
                {a.user.name.charAt(0)}
              </div>
              <div>
                <span className="text-xs font-semibold text-surface-700 block leading-none mb-0.5">{a.user.name}</span>
                <span className="text-[9px] text-surface-400 block leading-none truncate max-w-[100px]">{a.user.skills.map((s) => s.skill).join(', ')}</span>
              </div>
            </div>
            <button onClick={() => onUnassign(shift.id, a.userId)}
              className="text-[10px] font-medium text-surface-400 hover:text-red-600 transition-colors opacity-0 group-hover/assignment:opacity-100 bg-white px-2 py-1 rounded shadow-sm border border-surface-200">
              Remove
            </button>
          </div>
        ))}
        {shift.assignments.length === 0 && (
          <div className="bg-surface-50/50 border border-dashed border-surface-200 rounded-lg px-2.5 py-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-surface-200 flex items-center justify-center">
              <Plus className="w-3 h-3 text-surface-400" />
            </div>
            <p className="text-xs text-surface-400 font-medium italic">Unassigned</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pl-1.5">
        {!isFull && (
          <button onClick={() => onAssign(shift)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold py-1.5 rounded-lg transition-colors duration-200">
            <Plus className="w-3 h-3" /> Assign
          </button>
        )}
        {!shift.published && (
          <button onClick={() => onPublish(shift.id)}
            className="flex-1 bg-surface-900 hover:bg-black text-white shadow-premium text-xs font-semibold py-1.5 rounded-lg transition-all duration-200 active:scale-[0.98]">
            Publish
          </button>
        )}
      </div>
    </div>
  );
}

// ── Schedule Page ─────────────────────────────────────────────────────────────
function ScheduleContent({ locationId }: { locationId: string }) {
  useQueryClient();
  const [weekOf, setWeekOf] = useState(getCurrentWeekOf);
  const [assigningShift, setAssigningShift] = useState<Shift | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: location } = useQuery<Location>({
    queryKey: ['location', locationId],
    queryFn: () => api.get(`/locations/${locationId}`).then((r) => r.data),
  });

  const { data: shifts, isLoading, refetch } = useQuery<Shift[]>({
    queryKey: ['shifts', locationId, weekOf],
    queryFn: () => api.get('/shifts', { params: { locationId, weekOf } }).then((r) => r.data),
    enabled: !!locationId,
  });

  async function handleUnassign(shiftId: string, userId: string) {
    await api.delete(`/shifts/${shiftId}/assign/${userId}`);
    refetch();
  }

  async function handlePublish(shiftId: string) {
    await api.patch(`/shifts/${shiftId}/publish`);
    refetch();
  }

  // Group shifts by day
  const monday = new Date(weekOf);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  function getShiftsForDay(day: Date): Shift[] {
    if (!shifts) return [];
    return shifts.filter((s) => {
      const shiftDay = new Date(s.startTime);
      return shiftDay.getUTCFullYear() === day.getUTCFullYear() &&
        shiftDay.getUTCMonth() === day.getUTCMonth() &&
        shiftDay.getUTCDate() === day.getUTCDate();
    });
  }

  return (
    <div className="max-w-7xl mx-auto p-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">{location?.name ?? '…'}</h1>
            <span className="text-xs font-bold uppercase tracking-wider bg-surface-100 text-surface-500 px-2 py-0.5 rounded-md border border-surface-200">
              {location?.timezone}
            </span>
          </div>
          <p className="text-sm text-surface-500">Manage schedules, publish shifts, and assign staff</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-surface-200 rounded-lg shadow-sm p-1">
            <button onClick={() => setWeekOf(addWeeksToISO(weekOf, -1))}
              className="p-1.5 hover:bg-surface-50 rounded-md transition-colors text-surface-600 hover:text-surface-900">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-surface-700 w-44 text-center">{formatWeekLabel(weekOf)}</span>
            <button onClick={() => setWeekOf(addWeeksToISO(weekOf, 1))}
              className="p-1.5 hover:bg-surface-50 rounded-md transition-colors text-surface-600 hover:text-surface-900">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-premium hover:shadow-premium-hover transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]">
            <Plus className="w-4 h-4" strokeWidth={3} /> New Shift
          </button>
        </div>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const label = format(day, 'EEE');
            const dateNum = format(day, 'd');
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <div key={day.toISOString()} className={`flex flex-col rounded-[20px] pb-4 ${isToday ? 'bg-brand-50/30 border border-brand-100 ring-1 ring-brand-100/50 ring-inset' : 'bg-transparent'}`}>
                <div className={`text-center mb-4 py-3 px-2 border-b-2 flex flex-col items-center mx-3 ${isToday ? 'border-brand-500' : 'border-surface-200'}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${isToday ? 'text-brand-600' : 'text-surface-500'}`}>{label}</p>
                  <div className={`mt-1 w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-900 bg-transparent'}`}>
                    <p className="text-base font-bold">{dateNum}</p>
                  </div>
                </div>
                <div className="space-y-3 px-3 flex-1">
                  {dayShifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      location={location!}
                      onAssign={setAssigningShift}
                      onUnassign={handleUnassign}
                      onPublish={handlePublish}
                    />
                  ))}
                  {dayShifts.length === 0 && (
                    <div className="border-2 border-dashed border-surface-200 rounded-[16px] h-20 flex flex-col items-center justify-center bg-surface-50/50 text-surface-400 group hover:bg-surface-50 hover:border-surface-300 transition-colors">
                      <Plus className="w-4 h-4 mb-1 opacity-50 text-surface-400 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {assigningShift && location && (
        <AssignModal
          shift={assigningShift}
          location={location}
          onClose={() => setAssigningShift(null)}
          onAssigned={() => refetch()}
        />
      )}
      {showCreateModal && (
        <CreateShiftModal
          locationId={locationId}
          weekOf={weekOf}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => refetch()}
        />
      )}
    </div>
  );
}

export default function SchedulePage() {
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId ?? '';
  return (
    <AuthGuard>
      <Navbar />
      <ScheduleContent locationId={locationId} />
    </AuthGuard>
  );
}
