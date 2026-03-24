'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Location } from '@/lib/types';
import { useSocketEvent } from '@/hooks/useSocket';
import { Users, Clock } from 'lucide-react';

interface OnDutyShift {
  shiftId: string;
  requiredSkill: string;
  startTime: string;
  endTime: string;
  staff: { userId: string; name: string; email: string; skills: { skill: string }[] }[];
}

function LocationCard({ location }: { location: Location }) {
  const qc = useQueryClient();

  const { data: onDuty, isLoading } = useQuery<OnDutyShift[]>({
    queryKey: ['on-duty', location.id],
    queryFn: () => api.get(`/locations/${location.id}/on-duty`).then((r) => r.data),
    refetchInterval: 60_000, // refresh every minute
  });

  // Invalidate on real-time schedule update
  useSocketEvent('schedule:updated', () => {
    qc.invalidateQueries({ queryKey: ['on-duty', location.id] });
  });
  useSocketEvent('schedule:published', () => {
    qc.invalidateQueries({ queryKey: ['on-duty', location.id] });
  });
  useSocketEvent('assignment:created', () => {
    qc.invalidateQueries({ queryKey: ['on-duty', location.id] });
  });

  const totalStaff = onDuty?.reduce((sum, s) => sum + s.staff.length, 0) ?? 0;
  const now = new Date();
  const localTime = format(toZonedTime(now, location.timezone), 'h:mm a zzz');

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{location.name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{location.timezone} · {localTime}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${totalStaff > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <Users className="w-3.5 h-3.5" />
          {totalStaff} on duty
        </div>
      </div>

      <div className="p-5">
        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
        {!isLoading && (!onDuty || onDuty.length === 0) && (
          <p className="text-sm text-gray-400 italic">No active shifts right now.</p>
        )}
        {onDuty && onDuty.length > 0 && (
          <div className="space-y-4">
            {onDuty.map((shift) => (
              <div key={shift.shiftId}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">
                    {format(toZonedTime(new Date(shift.startTime), location.timezone), 'h:mm a')}
                    {' – '}
                    {format(toZonedTime(new Date(shift.endTime), location.timezone), 'h:mm a')}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                    {shift.requiredSkill}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {shift.staff.map((s) => (
                    <div key={s.userId} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 leading-none">{s.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{s.skills.map((sk) => sk.skill).join(', ')}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[10px] text-green-600 font-medium">On duty</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OnDutyContent() {
  const qc = useQueryClient();

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  });

  // Live clock tick — refetch all on-duty data every minute
  useEffect(() => {
    const timer = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['on-duty'] });
    }, 60_000);
    return () => clearInterval(timer);
  }, [qc]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">On Duty Now</h1>
          <p className="text-gray-500 text-sm mt-1">Live view of who is currently working at each location</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Updates in real-time
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {locations?.map((loc) => (
          <LocationCard key={loc.id} location={loc} />
        ))}
      </div>
    </div>
  );
}

export default function OnDutyPage() {
  return (
    <AuthGuard>
      <Navbar />
      <OnDutyContent />
    </AuthGuard>
  );
}
