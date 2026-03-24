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
    { href: '/availability', label: 'Availability', roles: ['STAFF'] },
    { href: '/on-duty', label: 'On Duty', roles: ['ADMIN', 'MANAGER'] },
    { href: '/audit-logs', label: 'Audit Log', roles: ['ADMIN', 'MANAGER'] },
    { href: '/analytics', label: 'Analytics', roles: ['ADMIN', 'MANAGER'] },
    { href: '/settings', label: 'Settings', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  ];

  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200 shadow-sm">
      <nav className="px-6 py-3.5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-premium">
              <span className="font-bold text-white text-sm">S</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-surface-900 text-base leading-tight tracking-tight">ShiftSync</span>
              <span className="text-surface-500 text-[10px] font-medium uppercase tracking-wider hidden sm:block">Coastal Eats</span>
            </div>
          </div>
          <div className="flex gap-1">
            {links.filter((l) => !user?.role || l.roles.includes(user.role)).map((l) => {
              const isActive = pathname === l.href || pathname.startsWith(l.href + '/');
              return (
                <Link key={l.href} href={l.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-surface-100 text-brand-700 shadow-sm' 
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                  }`}>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border-r border-surface-200 pr-4">
            <span className="text-sm font-medium text-surface-700">{user?.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 border border-brand-200 text-brand-600 px-2 py-0.5 rounded-full">
              {user?.role}
            </span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-surface-500 hover:text-surface-900 transition-colors">
            Sign out
          </button>
        </div>
      </nav>
    </div>
  );
}
