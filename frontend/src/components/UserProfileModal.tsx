import React, { useState } from 'react';
import { X, User as UserIcon, LogOut, Loader2, Save } from 'lucide-react';
import { auth } from '../firebase';
import { updateProfile, signOut, User } from 'firebase/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(user, { displayName });
      setSuccess('Profile updated successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-indalpha-dark border border-indalpha-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-indalpha-muted hover:text-indalpha-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-indalpha-text">Your Profile</h2>
              <p className="text-sm text-indalpha-muted">
                {user.email || user.phoneNumber || 'User Account'}
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indalpha-text mb-1">
                Display Name
              </label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-indalpha-card border border-indalpha-border text-indalpha-text rounded-lg px-4 py-2 focus:outline-none focus:border-indalpha-green transition-colors"
              />
            </div>
            
            {error && <div className="text-sm text-indalpha-red">{error}</div>}
            {success && <div className="text-sm text-indalpha-green">{success}</div>}
            
            <button
              type="submit"
              disabled={loading || displayName === user.displayName}
              className="w-full flex items-center justify-center gap-2 bg-indalpha-green text-black font-semibold rounded-lg py-2 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-indalpha-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold rounded-lg py-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
