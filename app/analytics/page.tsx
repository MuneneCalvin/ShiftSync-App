'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Location } from '@/lib/types';
import { AlertTriangle, TrendingUp, Users, Calendar } from 'lucide-react';

interface OvertimeSummary {
  userId: string;
  name: string;
  weekOf: string;
  totalHours: number;
  overtimeHours: number;
  shifts: { shiftId: string; date: string; hours: number; locationName: string }[];
}

interface StaffHoursSummary {
  userId: string;
  name: string;
  email: string;
  totalHours: number;
  weeklyBreakdown: { weekOf: string; hours: number }[];
  saturdayEveningShifts: number;
  desiredHoursPerWeek: number | null;
  hoursVariance: number | null;
}

interface FairnessReport {
  locationId: string;
  locationName: string;
  staff: StaffHoursSummary[];
  fairnessScore: number;
  saturdayEveningDistribution: { userId: string; name: string; count: number }[];
}

interface HoursDistributionWeek {
  weekOf: string;
  staff: { name: string; hours: number }[];
}

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-teal-500',
];

function FairnessScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600 bg-green-50 border-green-200'
    : score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';
  const label = score >= 80 ? 'Fair' : score >= 60 ? 'Moderate' : 'Unequal';
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-semibold ${color}`}>
      {score}/100 — {label}
    </span>
  );
}

function HoursBar({ hours, max, color }: { hours: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((hours / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-12 text-right">{hours}h</span>
    </div>
  );
}

function OvertimePanel() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<OvertimeSummary[]>({
    queryKey: ['analytics-overtime'],
    queryFn: () => api.get('/analytics/overtime?weeksBack=6').then((r) => r.data),
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Loading overtime data…</p>;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4 text-sm">
        <TrendingUp className="w-4 h-4" />
        No overtime in the past 6 weeks.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const key = `${row.userId}-${row.weekOf}`;
        const isOpen = expanded === key;
        return (
          <div key={key} className="border border-orange-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition text-left"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <span className="font-medium text-gray-900">{row.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    week of {format(new Date(row.weekOf), 'MMM d')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-orange-700">
                  {row.totalHours}h total (+{row.overtimeHours}h OT)
                </span>
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 py-3 bg-white border-t border-orange-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">Shifts that week:</p>
                <div className="space-y-1">
                  {row.shifts.map((s) => (
                    <div key={s.shiftId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {format(new Date(s.date), 'EEE MMM d, h:mm a')} — {s.locationName}
                      </span>
                      <span className="text-gray-500 font-medium">{s.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FairnessPanel({ locationId }: { locationId: string }) {
  const { data, isLoading } = useQuery<FairnessReport>({
    queryKey: ['analytics-fairness', locationId],
    queryFn: () =>
      api.get(`/analytics/fairness/${locationId}?weeksBack=6`).then((r) => r.data),
    enabled: !!locationId,
  });

  if (!locationId) return <p className="text-gray-400 text-sm">Select a location above.</p>;
  if (isLoading) return <p className="text-gray-400 text-sm">Loading fairness data…</p>;
  if (!data) return null;

  const maxHours = Math.max(...data.staff.map((s) => s.totalHours), 1);

  return (
    <div className="space-y-6">
      {/* Fairness score */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{data.locationName}</h3>
          <p className="text-sm text-gray-500">6-week distribution</p>
        </div>
        <FairnessScoreBadge score={data.fairnessScore} />
      </div>

      {/* Hours distribution per staff */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Total Hours (6 weeks)</h4>
        <div className="space-y-3">
          {data.staff.map((s, i) => (
            <div key={s.userId}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${COLORS[i % COLORS.length]}`} />
                  <span className="text-sm text-gray-800">{s.name}</span>
                  {s.desiredHoursPerWeek && (
                    <span className="text-xs text-gray-400">({s.desiredHoursPerWeek}h/wk desired)</span>
                  )}
                </div>
                {s.hoursVariance !== null && (
                  <span
                    className={`text-xs font-medium ${s.hoursVariance > 0 ? 'text-orange-600' : s.hoursVariance < -4 ? 'text-blue-600' : 'text-green-600'}`}
                  >
                    {s.hoursVariance > 0 ? `+${s.hoursVariance}` : s.hoursVariance}h/wk avg
                  </span>
                )}
              </div>
              <HoursBar hours={s.totalHours} max={maxHours} color={COLORS[i % COLORS.length]} />
            </div>
          ))}
        </div>
      </div>

      {/* Saturday Evening Distribution */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Saturday Evening Shifts (6 weeks)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Staff</th>
                <th className="text-right py-2 text-gray-500 font-medium">Sat Eve Shifts</th>
                <th className="text-right py-2 text-gray-500 font-medium">Total Shifts (approx)</th>
              </tr>
            </thead>
            <tbody>
              {data.saturdayEveningDistribution.map((row) => (
                <tr key={row.userId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-800">{row.name}</td>
                  <td className="py-2 text-right">
                    {row.count === 0 ? (
                      <span className="text-blue-600 font-semibold">0</span>
                    ) : (
                      <span className="text-gray-700">{row.count}</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-gray-500">
                    {data.staff.find((s) => s.userId === row.userId)?.weeklyBreakdown.length ?? 0} weeks active
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.saturdayEveningDistribution.some((r) => r.count === 0) && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
            <span>
              Some staff have <strong>0 Saturday evening shifts</strong> in the past 6 weeks. Consider reassigning for equitable distribution.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function HoursDistributionPanel({ locationId }: { locationId: string }) {
  const { data, isLoading } = useQuery<HoursDistributionWeek[]>({
    queryKey: ['analytics-hours-dist', locationId],
    queryFn: () =>
      api.get(`/analytics/hours-distribution/${locationId}?weeksBack=8`).then((r) => r.data),
    enabled: !!locationId,
  });

  if (!locationId) return null;
  if (isLoading) return <p className="text-gray-400 text-sm">Loading hours distribution…</p>;
  if (!data || data.length === 0) return <p className="text-gray-400 text-sm">No data available.</p>;

  // Get all unique staff names
  const allStaff = Array.from(new Set(data.flatMap((w) => w.staff.map((s) => s.name))));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-medium sticky left-0 bg-white">Staff</th>
            {data.map((w) => (
              <th key={w.weekOf} className="text-right py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                {format(new Date(w.weekOf), 'MMM d')}
              </th>
            ))}
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {allStaff.map((name, i) => {
            const weekHours = data.map(
              (w) => w.staff.find((s) => s.name === name)?.hours ?? 0,
            );
            const total = weekHours.reduce((a, b) => a + b, 0);
            return (
              <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3 sticky left-0 bg-white">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${COLORS[i % COLORS.length]}`} />
                    <span className="text-gray-800">{name}</span>
                  </div>
                </td>
                {weekHours.map((h, wi) => (
                  <td key={wi} className="py-2 px-3 text-right">
                    {h > 0 ? (
                      <span className={h > 40 ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                        {h}h
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-semibold text-gray-900">{Math.round(total * 10) / 10}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsContent() {
  const [activeTab, setActiveTab] = useState<'overtime' | 'fairness' | 'distribution'>('overtime');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
    select: (locs) => {
      if (!selectedLocation && locs.length > 0) {
        // auto-select first — can't call setState here, use useEffect instead
      }
      return locs;
    },
  });

  // Auto-select first location on load
  const effectiveLocation = selectedLocation || (locations?.[0]?.id ?? '');

  const tabs = [
    { id: 'overtime' as const, label: 'Overtime', icon: AlertTriangle },
    { id: 'fairness' as const, label: 'Fairness', icon: Users },
    { id: 'distribution' as const, label: 'Hours Distribution', icon: TrendingUp },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Overtime tracking, fairness reporting, and hours distribution</p>
      </div>

      {/* Location selector (for fairness + distribution tabs) */}
      {(activeTab === 'fairness' || activeTab === 'distribution') && (
        <div className="mb-5 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Location:</label>
          <select
            value={effectiveLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {activeTab === 'overtime' && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Overtime Alerts — Past 6 Weeks
            </h2>
            <OvertimePanel />
          </div>
        )}
        {activeTab === 'fairness' && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Fairness Report
            </h2>
            <FairnessPanel locationId={effectiveLocation} />
          </div>
        )}
        {activeTab === 'distribution' && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Hours Distribution — Past 8 Weeks
            </h2>
            <HoursDistributionPanel locationId={effectiveLocation} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <Navbar />
      <AnalyticsContent />
    </AuthGuard>
  );
}
