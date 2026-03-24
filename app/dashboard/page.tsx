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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8 animate-pulse flex space-x-4">
        <div className="flex-1 space-y-6 py-1">
          <div className="h-6 bg-surface-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-32 bg-surface-200 rounded-2xl"></div>
            <div className="h-32 bg-surface-200 rounded-2xl"></div>
            <div className="h-32 bg-surface-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Facilities</h1>
        <p className="text-surface-500 text-sm mt-1">Select a location to manage shifts and schedules</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {locations?.map((loc) => (
          <button
            key={loc.id}
            onClick={() => router.push(`/schedule/${loc.id}`)}
            className="group relative bg-white border border-surface-200/60 rounded-[20px] p-6 text-left shadow-sm hover:shadow-premium-hover hover:border-brand-300 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            {/* Subtle gradient hover effect inside card */}
            <div className="absolute inset-0 bg-linear-to-br from-brand-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-surface-50 group-hover:bg-brand-50 border border-surface-100 group-hover:border-brand-200 rounded-2xl flex items-center justify-center transition-colors duration-300 shadow-sm">
                  <MapPin className="w-5 h-5 text-surface-600 group-hover:text-brand-600 transition-colors duration-300" />
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-50 flex items-center justify-center group-hover:bg-brand-600 transition-colors duration-300">
                  <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-white transition-colors duration-300 transform group-hover:translate-x-0.5" />
                </div>
              </div>
              <h2 className="font-semibold text-surface-900 text-lg leading-tight mb-1">{loc.name}</h2>
              <p className="text-sm text-surface-500 font-medium">{loc.timezone}</p>
            </div>
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
