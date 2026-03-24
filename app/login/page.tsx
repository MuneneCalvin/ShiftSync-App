'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { storeAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      storeAuth(data.accessToken, data.refreshToken, data.user);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 relative overflow-hidden selection:bg-brand-200 selection:text-brand-900">
      {/* Decorative ambient background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="bg-white rounded-[24px] shadow-premium border border-surface-200/50 p-10 w-full max-w-[400px] relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-premium">
            <span className="font-bold text-white text-xl">S</span>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight mb-1.5">Welcome back</h1>
          <p className="text-surface-500 text-sm">Sign in to Coastal Eats scheduling</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-700">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="manager@coastaleats.com"
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-700">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required placeholder="••••••••"
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-xl shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in to account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-100 text-xs text-surface-500 space-y-1.5 text-center">
          <p className="font-medium text-surface-600 mb-2">Test accounts:</p>
          <div className="flex justify-between bg-surface-50 px-3 py-2 rounded-lg border border-surface-200">
            <span>manager.la@coastaleats.com</span>
            <span className="font-medium">Manager1!</span>
          </div>
          <div className="flex justify-between bg-surface-50 px-3 py-2 rounded-lg border border-surface-200">
            <span>admin@coastaleats.com</span>
            <span className="font-medium">Admin123!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
