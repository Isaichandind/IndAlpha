import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const hashPassword = async (str: string) => {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hash = await hashPassword(password);
    // Hash is derived from the access code, making it secure against source code inspection.
    if (hash === '40fab0567fde6c702cdb9580950ac8d8c8a3e7b3838799d82d419d6985eb8b74') {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-indalpha-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-indalpha-card border border-indalpha-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indalpha-green/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indalpha-blue/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-indalpha-green/10 text-indalpha-green rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-bold text-indalpha-text mb-2 tracking-tight">
            IndAlpha PRO
          </h1>
          <p className="text-indalpha-muted text-center text-sm mb-8">
            Please enter your access code to view professional insights and screener data.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Code"
                className={`w-full bg-indalpha-dark border rounded-xl px-5 py-3.5 text-indalpha-text focus:outline-none focus:ring-2 transition-all ${
                  error ? 'border-indalpha-red focus:ring-indalpha-red/20' : 'border-indalpha-border focus:border-indalpha-green focus:ring-indalpha-green/20'
                }`}
                autoFocus
              />
              {error && (
                <p className="text-indalpha-red text-sm mt-2 font-medium text-center animate-fade-in">
                  Incorrect access code
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-indalpha-green hover:bg-emerald-400 text-black font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              Unlock Terminal <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
