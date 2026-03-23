'use client';
import { useRouter } from 'next/navigation';
import { getStoredUser, clearAuth } from '@/lib/auth';

export function Navbar() {
  const router = useRouter();
  const user = getStoredUser();

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <span className="font-bold text-lg tracking-tight">ShiftSync</span>
        <span className="text-slate-400 text-xs">Coastal Eats</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-300">{user?.name}</span>
        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">{user?.role}</span>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white transition">
          Sign out
        </button>
      </div>
    </nav>
  );
}
