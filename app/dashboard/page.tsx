'use client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Location } from '@/lib/types';
import { MapPin, ChevronRight } from 'lucide-react';

function DashboardContent() {
  const router = useRouter();

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  });

  if (isLoading) return <p className="text-gray-400 p-8">Loading locations…</p>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Select a location to manage its schedule</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {locations?.map((loc) => (
          <button
            key={loc.id}
            onClick={() => router.push(`/schedule/${loc.id}`)}
            className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-400 hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition mt-1" />
            </div>
            <h2 className="font-semibold text-gray-900 text-sm leading-tight">{loc.name}</h2>
            <p className="text-xs text-gray-400 mt-1">{loc.timezone}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Navbar />
      <DashboardContent />
    </AuthGuard>
  );
}
