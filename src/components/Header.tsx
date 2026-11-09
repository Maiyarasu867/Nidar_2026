'use client';

import React from 'react';
import { Member } from '@/lib/db';
import { LogOutIcon, UsersIcon } from './Icons';

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
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 text-neutral-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        
        {/* Top Bar */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* Brand / Logo */}
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="font-bold tracking-tight text-white text-base sm:text-lg">NIDAR</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono hidden md:inline-block">
              Progress Log
            </span>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden sm:flex items-center space-x-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs sm:text-sm">
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
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* User identification badge */}
            <div className="flex items-center space-x-1.5 bg-neutral-950/80 px-2 py-1 rounded-lg border border-neutral-800 text-xs">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {currentMember.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-neutral-200 truncate max-w-[80px] sm:max-w-[120px]">
                {currentMember.name}
              </span>
              <span className="font-mono text-neutral-400 text-[10px] bg-neutral-800 px-1 py-0.2 rounded hidden xs:inline">
                {currentMember.username ? `@${currentMember.username}` : currentMember.id}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenTeamModal}
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
              title="View Team Members"
            >
              <UsersIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
              title="Switch User / Logout"
            >
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Tabs (Full width, segmented bar visible only on <sm screens) */}
        <div className="sm:hidden pb-2.5 pt-0.5">
          <nav className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                activeTab === 'logs'
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Logs Feed
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('checklists')}
              className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center space-x-1 ${
                activeTab === 'checklists'
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Checklists</span>
              {pendingChecklistsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-bold">
                  {pendingChecklistsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('meetings')}
              className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center space-x-1 ${
                activeTab === 'meetings'
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Meetings</span>
              {upcomingMeetingsCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          </nav>
        </div>

      </div>
    </header>
  );
}
