'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredUser, clearAuth } from '@/lib/auth';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getStoredUser();

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  const links = [
    { href: '/dashboard', label: 'Locations', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { href: '/swaps', label: 'Swap Requests', roles: ['ADMIN', 'MANAGER'] },
    { href: '/my-shifts', label: 'My Shifts', roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  ];

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">ShiftSync</span>
          <span className="text-slate-400 text-xs hidden sm:block">Coastal Eats</span>
        </div>
        <div className="flex gap-1">
          {links.filter((l) => !user?.role || l.roles.includes(user.role)).map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${pathname === l.href || pathname.startsWith(l.href + '/') ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-300 hidden sm:block">{user?.name}</span>
        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">{user?.role}</span>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white transition">Sign out</button>
      </div>
    </nav>
  );
}
