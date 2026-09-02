import React, { useState, useEffect } from 'react';
import { Lock, X, AlertCircle, Mail, Key, ChevronDown } from 'lucide-react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMethod = 'phone' | 'email';
type EmailMode = 'signin' | 'signup';

const COUNTRIES = [
  { code: '+91', label: 'IN (+91)' },
  { code: '+1', label: 'US (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+61', label: 'AU (+61)' },
];

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  
  // Phone State
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  
  // Email State
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!(window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
          });
        } catch (e) {
          // ignore
        }
      }
    } else {
      // Clear state when closing
      setVerificationId(null);
      setPhoneNumber('');
      setVerificationCode('');
      setError('');
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (emailMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const appVerifier = (window as any).recaptchaVerifier;
      // Strip any leading '+' or '0' if user typed it
      const cleanPhone = phoneNumber.replace(/^0+/, '').replace(/^\+/, '');
      const formattedPhone = `${countryCode}${cleanPhone}`;
      
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setVerificationId(confirmationResult);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Check phone format.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verificationId.confirm(verificationCode);
      onClose(); // success!
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md overflow-hidden bg-gray-900 border shadow-2xl rounded-2xl border-white/10 ring-1 ring-white/5" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 w-full h-32 opacity-20 bg-gradient-to-b from-blue-500 to-transparent pointer-events-none"></div>
        
        <button 
          type="button"
          onClick={onClose}
          className="absolute p-1 transition-colors rounded-full top-4 right-4 text-gray-400 hover:text-white hover:bg-white/10 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white">
              {verificationId ? 'Enter Code' : 'Welcome to IndAlpha'}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {verificationId ? 'We sent a verification code to your phone.' : 'Sign in to access premium features.'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 text-sm text-red-200 bg-red-900/50 rounded-xl ring-1 ring-red-500/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!verificationId ? (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex items-center justify-center w-full py-2.5 mb-6 text-sm font-semibold text-white transition-all bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center mb-6">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="px-3 text-xs text-gray-500 uppercase">Or continue with</span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>

              <div className="flex p-1 mb-6 bg-gray-800/50 rounded-xl ring-1 ring-white/10">
                <button
                  type="button"
                  onClick={() => { setAuthMethod('phone'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authMethod === 'phone' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Phone
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('email'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${authMethod === 'email' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Email
                </button>
              </div>

              {authMethod === 'phone' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-300">Mobile Number</label>
                    <div className="flex overflow-hidden rounded-xl bg-gray-800/50 border border-white/10 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                      <div className="relative flex items-center bg-gray-800 border-r border-white/10">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="py-2.5 pl-3 pr-8 text-sm text-gray-300 bg-transparent appearance-none focus:outline-none cursor-pointer"
                        >
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.code} className="bg-gray-800">{c.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute w-4 h-4 text-gray-500 pointer-events-none right-2" />
                      </div>
                      
                      <div className="relative flex-1">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          required
                          className="w-full py-2.5 px-3 text-white bg-transparent focus:outline-none placeholder-gray-500"
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !phoneNumber}
                    className="w-full py-3 mt-4 text-sm font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-300">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full py-2.5 pl-10 pr-4 text-white bg-gray-800/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 transition-all"
                        placeholder="you@example.com"
                      />
                      <Mail className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-300">Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full py-2.5 pl-10 pr-4 text-white bg-gray-800/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 transition-all"
                        placeholder="••••••••"
                      />
                      <Key className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full py-3 mt-4 text-sm font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? 'Processing...' : (emailMode === 'signin' ? 'Sign In' : 'Create Account')}
                  </button>
                  
                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={() => setEmailMode(emailMode === 'signin' ? 'signup' : 'signin')}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {emailMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-300">Verification Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full py-2.5 pl-10 pr-4 text-white bg-gray-800/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 transition-all text-center tracking-widest font-mono text-lg"
                    placeholder="123456"
                    maxLength={6}
                  />
                  <Lock className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full py-3 mt-6 text-sm font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setVerificationId(null);
                  setError('');
                }}
                className="w-full py-2 mt-2 text-sm font-semibold text-gray-400 transition-all hover:text-white"
              >
                Change Phone Number
              </button>
            </form>
          )}

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}
