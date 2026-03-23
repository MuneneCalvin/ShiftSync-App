import { Violation } from '@/lib/types';
import { AlertTriangle, XCircle } from 'lucide-react';

export function ViolationBanner({ violations }: { violations: Violation[] }) {
  if (!violations.length) return null;

  return (
    <div className="space-y-2 my-3">
      {violations.map((v, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
            v.severity === 'BLOCK'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
          }`}
        >
          {v.severity === 'BLOCK' ? (
            <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
          )}
          <span>{v.message}</span>
        </div>
      ))}
    </div>
  );
}
