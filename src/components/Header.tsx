'use client';

import React from 'react';
import { Member } from '@/lib/db';
import { LogOutIcon, UsersIcon, CalendarIcon, CheckCircleIcon } from './Icons';

interface HeaderProps {
  currentMember: Member;
  activeTab: 'logs' | 'checklists' | 'meetings' | 'team';
  setActiveTab: (tab: 'logs' | 'checklists' | 'meetings' | 'team') => void;
  onLogout: () => void;
  pendingChecklistsCount?: number;
  upcomingMeetingsCount?: number;
  onOpenTeamModal: () => void;
}

export function Header({
  currentMember,
  activeTab,
  setActiveTab,
  onLogout,
  pendingChecklistsCount = 0,
  upcomingMeetingsCount = 0,
  onOpenTeamModal,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold tracking-tight text-white text-base sm:text-lg">NIDAR</span>
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono hidden sm:inline-block">
              Progress Log
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'logs'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Logs Feed
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklists')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'checklists'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Checklists</span>
            {pendingChecklistsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingChecklistsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meetings')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'meetings'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Meetings</span>
            {upcomingMeetingsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </nav>

        {/* User Badge & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            type="button"
            onClick={onOpenTeamModal}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
            title="View Team Members"
          >
            <UsersIcon className="w-4 h-4" />
          </button>

          <div className="hidden md:flex flex-col text-right leading-tight">
            <span className="text-xs font-semibold text-white truncate max-w-[120px]">
              {currentMember.name}
            </span>
            <span className="text-[11px] text-neutral-400 truncate max-w-[120px]">
              {currentMember.role} • <span className="font-mono text-neutral-300">{currentMember.id}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
            title="Switch User / Logout"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
