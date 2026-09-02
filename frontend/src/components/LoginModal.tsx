import React, { useState, useEffect } from 'react';
import { Phone, Lock, X, AlertCircle } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
      }
    } else {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (error) {
          // Ignore clear errors
        }
        (window as any).recaptchaVerifier = null;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const appVerifier = (window as any).recaptchaVerifier;
      // Make sure phone number has country code, e.g., +1
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
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
        <div className="absolute top-0 w-full h-32 opacity-20 bg-gradient-to-b from-blue-500 to-transparent"></div>
        
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
              {verificationId ? 'We sent a verification code to your phone.' : 'Sign in instantly with your mobile number.'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 text-sm text-red-200 bg-red-900/50 rounded-xl ring-1 ring-red-500/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!verificationId ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-300">Mobile Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full py-2.5 pl-10 pr-4 text-white bg-gray-800/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 transition-all"
                    placeholder="9876543210"
                  />
                  <Phone className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                </div>
                <p className="mt-2 text-xs text-gray-500">We'll text you a code to verify your identity.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-6 text-sm font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-300">Verification Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
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
                disabled={loading}
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
