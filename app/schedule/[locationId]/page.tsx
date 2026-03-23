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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold">Assign Staff</h2>
          <p className="text-sm text-gray-500 mt-1">
            {shift.requiredSkill} · {formatShiftTime(shift.startTime, location.timezone)}–{formatShiftTime(shift.endTime, location.timezone)} · {location.name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff User ID</label>
            <div className="flex gap-2">
              <input
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setCheckResult(null); }}
                placeholder="Enter staff user ID…"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCheck}
                disabled={!userId.trim() || checking}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
              >
                {checking && <Loader2 className="w-3 h-3 animate-spin" />}
                Check
              </button>
            </div>
          </div>

          {checkResult && (
            <div>
              <div className={`flex items-center gap-2 text-sm font-medium mb-2 ${checkResult.allowed ? 'text-green-700' : 'text-red-700'}`}>
                {checkResult.allowed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {checkResult.allowed ? 'All constraints pass' : 'Constraint violations found'}
                {checkResult.projectedWeeklyHours !== undefined && (
                  <span className="ml-auto text-gray-500 font-normal">{checkResult.projectedWeeklyHours}hr projected this week</span>
                )}
              </div>
              <ViolationBanner violations={checkResult.violations} />

              {needsOvertimeOverride && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Override Reason (required for overtime block)
                  </label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why this overtime is necessary…"
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {checkResult.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Suggested alternatives:</p>
                  <div className="space-y-2">
                    {checkResult.suggestions.map((s) => (
                      <button
                        key={s.userId}
                        onClick={() => handleSuggestion(s)}
                        className="w-full text-left bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm hover:bg-blue-100 transition"
                      >
                        <span className="font-medium text-blue-800">{s.name}</span>
                        <span className="text-blue-600 ml-2 text-xs">{s.reason}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {assignError && <p className="text-red-600 text-sm">{assignError}</p>}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={handleAssign}
            disabled={!checkResult || !canAssign || assigning}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
          >
            {assigning && <Loader2 className="w-3 h-3 animate-spin" />}
            Assign
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold">Create Shift</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Skill</label>
            <select value={skill} onChange={(e) => setSkill(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {skills.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headcount</label>
            <input type="number" min={1} max={10} value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleCreate} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
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
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${shift.published ? 'border-green-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {shift.requiredSkill}
          </span>
          {shift.published && (
            <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Published</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{shift.assignments.length}/{shift.headcount} staff</span>
      </div>

      <p className="text-sm font-medium text-gray-800 mb-3">
        {formatShiftTime(shift.startTime, location.timezone)} – {formatShiftTime(shift.endTime, location.timezone)}
      </p>

      <div className="space-y-1 mb-3">
        {shift.assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
            <div>
              <span className="text-xs font-medium text-gray-700">{a.user.name}</span>
              <span className="text-xs text-gray-400 ml-2">{a.user.skills.map((s) => s.skill).join(', ')}</span>
            </div>
            <button onClick={() => onUnassign(shift.id, a.userId)}
              className="text-xs text-red-400 hover:text-red-600 transition ml-2">Remove</button>
          </div>
        ))}
        {shift.assignments.length === 0 && (
          <p className="text-xs text-gray-400 italic">No staff assigned</p>
        )}
      </div>

      <div className="flex gap-2">
        {!isFull && (
          <button onClick={() => onAssign(shift)}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 rounded-lg transition">
            <Plus className="w-3 h-3" /> Assign
          </button>
        )}
        {!shift.published && (
          <button onClick={() => onPublish(shift.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 rounded-lg transition">
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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{location?.name ?? '…'}</h1>
          <p className="text-sm text-gray-500">{location?.timezone}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOf(addWeeksToISO(weekOf, -1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 w-44 text-center">{formatWeekLabel(weekOf)}</span>
          <button onClick={() => setWeekOf(addWeeksToISO(weekOf, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus className="w-4 h-4" /> New Shift
          </button>
        </div>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading schedule…</p>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {days.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const label = format(day, 'EEE');
            const dateNum = format(day, 'd');
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <div key={day.toISOString()}>
                <div className={`text-center mb-2 pb-1 border-b ${isToday ? 'border-blue-400' : 'border-gray-200'}`}>
                  <p className={`text-xs font-semibold uppercase ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{label}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>{dateNum}</p>
                </div>
                <div className="space-y-2">
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
                    <div className="border-2 border-dashed border-gray-200 rounded-xl h-16 flex items-center justify-center">
                      <span className="text-xs text-gray-300">—</span>
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
