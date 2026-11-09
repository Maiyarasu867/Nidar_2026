'use client';

import React, { useState } from 'react';
import { Member } from '@/lib/db';
import { CopyIcon, CheckIcon, AlertCircleIcon, UserIcon } from './Icons';

interface AuthModalProps {
  onSuccess: (member: Member) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [memberId, setMemberId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newlyCreatedMember, setNewlyCreatedMember] = useState<Member | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', memberId: memberId.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('nidar_member', JSON.stringify(data.member));
      onSuccess(data.member);
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !passcode.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: name.trim(),
          role: role.trim(),
          passcode: passcode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setNewlyCreatedMember(data.member);
    } catch (err: any) {
      setError(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!newlyCreatedMember) return;
    navigator.clipboard.writeText(newlyCreatedMember.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceedWithNewId = () => {
    if (!newlyCreatedMember) return;
    localStorage.setItem('nidar_member', JSON.stringify(newlyCreatedMember));
    onSuccess(newlyCreatedMember);
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-neutral-100">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <UserIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">NIDAR Hub</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">Closed Team Progress & Activity Tracker</p>
        </div>

        {/* If newly registered, show ID confirmation step */}
        {newlyCreatedMember ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Registration Successful!</span>
              <p className="text-sm text-neutral-300 mt-1">Here is your unique Project Member ID:</p>
              
              <div className="flex items-center justify-center space-x-3 my-3">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-white bg-neutral-950 px-4 py-2 rounded-lg border border-neutral-700 tracking-wider">
                  {newlyCreatedMember.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 transition"
                  title="Copy ID"
                >
                  {copied ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <CopyIcon className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-xs text-neutral-400">
                Keep this ID safe! Next time, you just enter <span className="font-mono text-neutral-200">{newlyCreatedMember.id}</span> to log in instantly.
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceedWithNewId}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              Enter Project Hub →
            </button>
          </div>
        ) : (
          <div>
            {/* Mode Switch Tabs */}
            <div className="flex rounded-lg bg-neutral-950 p-1 mb-6 border border-neutral-800 text-sm">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-1.5 rounded-md font-medium transition ${
                  mode === 'login' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Existing Member
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 py-1.5 rounded-md font-medium transition ${
                  mode === 'register' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                New Member
              </button>
            </div>

            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-300 text-xs sm:text-sm mb-4">
                <AlertCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="memberId" className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Your Member ID
                  </label>
                  <input
                    id="memberId"
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="e.g. NDR-104"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono placeholder:font-sans placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm uppercase"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1.5">
                    No password required. Just your assigned member ID.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition shadow-lg shadow-blue-600/20 text-sm"
                >
                  {loading ? 'Checking ID...' : 'Enter Hub'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(null); }}
                    className="text-xs text-neutral-400 hover:text-blue-400 transition"
                  >
                    First time here? <span className="underline">Get an ID</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label htmlFor="regName" className="block text-xs font-medium text-neutral-300 mb-1">
                    Your Name
                  </label>
                  <input
                    id="regName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="regRole" className="block text-xs font-medium text-neutral-300 mb-1">
                    Project Role
                  </label>
                  <input
                    id="regRole"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Frontend Lead, Hardware, ML, QA"
                    required
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="regPasscode" className="block text-xs font-medium text-neutral-300 mb-1">
                    Project Access Key
                  </label>
                  <input
                    id="regPasscode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Team secret key (e.g. NIDAR2026)"
                    required
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Secures the website so only our project members can join.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-600/20 text-sm mt-2"
                >
                  {loading ? 'Creating Member ID...' : 'Generate My ID'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
