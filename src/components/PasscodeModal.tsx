import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { storageService } from '../services/storage';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passcode: string) => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setIsVerifying(true);
    setError(false);

    try {
      const isValid = await storageService.verifyPasscodeServer(passcode);
      if (isValid) {
        const submittedCode = passcode;
        setPasscode('');
        onSuccess(submittedCode);
        onClose();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Passcode verification error:', err);
      setError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock size={22} />
          </div>

          <div>
            <h3 className="text-lg font-bold font-mono tracking-wide">AUTHENTICATION REQUIRED</h3>
            <p className="text-xs text-slate-400 font-sans mt-1">
              Enter admin passcode to unlock editing and database management mode.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4 pt-2">
            <div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  placeholder="Enter passcode..."
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(false);
                  }}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-center text-sm font-mono tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition"
                />
              </div>

              {error && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-mono mt-2">
                  <AlertCircle size={14} />
                  <span>Invalid passcode. Please try again.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                <span>{isVerifying ? 'Verifying...' : 'Unlock'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
