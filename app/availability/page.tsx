'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Availability {
  id: string;
  type: 'RECURRING' | 'EXCEPTION';
  locationId: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  date: string | null;
  isBlocked: boolean;
}

interface Location {
  id: string;
  name: string;
  timezone: string;
}

interface UserProfile {
  certifications: { locationId: string; location: Location }[];
}

function AddRecurringModal({
  locations,
  onClose,
  onSaved,
}: {
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (startTime >= endTime) { setError('End time must be after start time.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/availability/me', {
        type: 'RECURRING',
        locationId,
        dayOfWeek,
        startTime,
        endTime,
      });
      onSaved(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Failed to save.');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Recurring Availability</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Day of Week</label>
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Until</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AddExceptionModal({
  locations,
  onClose,
  onSaved,
}: {
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [isBlocked, setIsBlocked] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!date) { setError('Date is required.'); return; }
    if (!isBlocked && startTime >= endTime) { setError('End time must be after start time.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/availability/me', {
        type: 'EXCEPTION',
        locationId,
        date,
        startTime: isBlocked ? '00:00' : startTime,
        endTime: isBlocked ? '00:00' : endTime,
        isBlocked,
      });
      onSaved(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Failed to save.');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Date Exception</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <div className="flex gap-2">
              <button onClick={() => setIsBlocked(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${isBlocked ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-700'}`}>
                Unavailable (full day)
              </button>
              <button onClick={() => setIsBlocked(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${!isBlocked ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>
                Custom hours
              </button>
            </div>
          </div>
          {!isBlocked && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Until</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
          {error && <p className="text-red-600 text-xs">{error}</p>}
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailabilityContent() {
  const qc = useQueryClient();
  const [showRecurring, setShowRecurring] = useState(false);
  const [showException, setShowException] = useState(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['my-profile-full'],
    queryFn: () => api.get('/users/me').then((r) => r.data),
  });

  const { data: availability } = useQuery<Availability[]>({
    queryKey: ['my-availability'],
    queryFn: () => api.get('/availability/me').then((r) => r.data),
  });

  const certifiedLocations: Location[] = (profile?.certifications ?? []).map((c) => c.location).filter(Boolean);

  async function handleDelete(id: string) {
    await api.delete(`/availability/${id}`);
    qc.invalidateQueries({ queryKey: ['my-availability'] });
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ['my-availability'] });
  }

  const recurring = (availability ?? []).filter((a) => a.type === 'RECURRING');
  const exceptions = (availability ?? []).filter((a) => a.type === 'EXCEPTION');

  // Group recurring by location
  const byLocation = certifiedLocations.map((loc) => ({
    location: loc,
    slots: recurring
      .filter((a) => a.locationId === loc.id)
      .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)),
  }));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
        <p className="text-gray-500 text-sm mt-1">
          Set your weekly availability windows and block out exception dates. Managers use this when assigning shifts.
        </p>
      </div>

      {certifiedLocations.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          You are not certified at any location yet. Contact your manager.
        </div>
      )}

      {/* Recurring availability */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Weekly Recurring</h2>
          <button onClick={() => setShowRecurring(true)} disabled={certifiedLocations.length === 0}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add Window
          </button>
        </div>

        <div className="space-y-5">
          {byLocation.map(({ location, slots }) => (
            <div key={location.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{location.name}</span>
                <span className="text-xs text-gray-400">{location.timezone}</span>
              </div>
              {slots.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-4 py-3">No recurring windows set.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 w-20">{DAYS[slot.dayOfWeek ?? 0]}</span>
                        <span className="text-sm text-gray-800">{slot.startTime} – {slot.endTime}</span>
                      </div>
                      <button onClick={() => handleDelete(slot.id)}
                        className="text-gray-300 hover:text-red-500 transition p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Exception dates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Date Exceptions</h2>
          <button onClick={() => setShowException(true)} disabled={certifiedLocations.length === 0}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add Exception
          </button>
        </div>

        {exceptions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No exceptions set.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-50">
            {exceptions
              .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
              .map((ex) => (
                <div key={ex.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {ex.date ? format(new Date(ex.date), 'EEE, MMM d yyyy') : '—'}
                    </span>
                    {ex.isBlocked ? (
                      <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Unavailable</span>
                    ) : (
                      <span className="text-xs text-gray-500">{ex.startTime} – {ex.endTime}</span>
                    )}
                    {ex.locationId && (
                      <span className="text-xs text-gray-400">
                        {certifiedLocations.find((l) => l.id === ex.locationId)?.name}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(ex.id)}
                    className="text-gray-300 hover:text-red-500 transition p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {showRecurring && (
        <AddRecurringModal locations={certifiedLocations} onClose={() => setShowRecurring(false)} onSaved={refresh} />
      )}
      {showException && (
        <AddExceptionModal locations={certifiedLocations} onClose={() => setShowException(false)} onSaved={refresh} />
      )}
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <AuthGuard>
      <Navbar />
      <AvailabilityContent />
    </AuthGuard>
  );
}
