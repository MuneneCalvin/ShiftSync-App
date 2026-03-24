'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Bell, Mail, CheckCircle } from 'lucide-react';

interface NotificationPrefs {
  emailEnabled: boolean;
  pushEnabled: boolean;
}

function SettingsContent() {
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery<NotificationPrefs>({
    queryKey: ['notification-prefs'],
    queryFn: () => api.get('/notifications/preferences').then((r) => r.data),
  });

  const { mutate: update, isSuccess } = useMutation({
    mutationFn: (dto: Partial<NotificationPrefs>) =>
      api.patch('/notifications/preferences', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your account preferences</p>

      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">Notification Preferences</h2>
          <p className="text-xs text-gray-500 mt-0.5">Choose how you receive notifications</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 p-6">Loading…</p>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">In-app notifications</p>
                  <p className="text-xs text-gray-500">Receive alerts inside the ShiftSync app</p>
                </div>
              </div>
              <button
                onClick={() => update({ pushEnabled: !prefs?.pushEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${prefs?.pushEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${prefs?.pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Email notifications</p>
                  <p className="text-xs text-gray-500">Receive email summaries for important updates</p>
                </div>
              </div>
              <button
                onClick={() => update({ emailEnabled: !prefs?.emailEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${prefs?.emailEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${prefs?.emailEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="px-6 py-3 bg-green-50 border-t border-green-100 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" /> Preferences saved
          </div>
        )}
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Navbar />
      <SettingsContent />
    </AuthGuard>
  );
}
