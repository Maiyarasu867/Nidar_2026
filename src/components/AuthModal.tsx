'use client';

import React, { useState } from 'react';
import { Member } from '@/lib/db';
import { CheckIcon, AlertCircleIcon, UserIcon } from './Icons';

interface AuthModalProps {
  onSuccess: (member: Member) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newlyCreatedMember, setNewlyCreatedMember] = useState<Member | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: username.trim() }),
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
    if (!regUsername.trim() || !name.trim() || !role.trim() || !passcode.trim()) {
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
          username: regUsername.trim(),
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

  const handleProceedWithNewAccount = () => {
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

        {/* If newly registered, show friendly confirmation */}
        {newlyCreatedMember ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                Registration Successful!
              </span>
              <p className="text-sm text-neutral-300 mt-1">Welcome to NIDAR, {newlyCreatedMember.name}!</p>
              
              <div className="my-3">
                <span className="inline-block text-xl sm:text-2xl font-mono font-bold text-white bg-neutral-950 px-4 py-2 rounded-lg border border-neutral-700 tracking-wide">
                  @{newlyCreatedMember.username || newlyCreatedMember.name}
                </span>
              </div>

              <p className="text-xs text-neutral-400">
                You can now log in anytime simply by typing your username <span className="font-semibold text-neutral-200">@{newlyCreatedMember.username}</span>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceedWithNewAccount}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition shadow-lg shadow-blue-600/20 text-sm"
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
                  <label htmlFor="loginUsername" className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Your Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-mono">@</span>
                    <input
                      id="loginUsername"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. maiyarasu"
                      autoFocus
                      required
                      className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm lowercase"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5">
                    Enter the username you registered with. No password needed.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition shadow-lg shadow-blue-600/20 text-sm"
                >
                  {loading ? 'Signing In...' : 'Enter Hub'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(null); }}
                    className="text-xs text-neutral-400 hover:text-blue-400 transition"
                  >
                    First time here? <span className="underline">Register username</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label htmlFor="regUsername" className="block text-xs font-medium text-neutral-300 mb-1">
                    Choose Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-mono">@</span>
                    <input
                      id="regUsername"
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      placeholder="e.g. maiyarasu"
                      required
                      className="w-full pl-8 pr-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm font-mono lowercase"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">This will be your personal login handle.</p>
                </div>

                <div>
                  <label htmlFor="regName" className="block text-xs font-medium text-neutral-300 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    id="regName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maiyarasu S"
                    required
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="regRole" className="block text-xs font-medium text-neutral-300 mb-1">
                    Project Role *
                  </label>
                  <input
                    id="regRole"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Team Lead, Hardware, ML, QA"
                    required
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="regPasscode" className="block text-xs font-medium text-neutral-300 mb-1">
                    Project Access Key *
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
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Secures the website so only our project members can join.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-600/20 text-sm mt-2"
                >
                  {loading ? 'Creating Member...' : 'Join Team Hub'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
