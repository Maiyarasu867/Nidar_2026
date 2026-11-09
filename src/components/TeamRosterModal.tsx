'use client';

import React from 'react';
import { Member } from '@/lib/db';
import { isISTToday } from '@/lib/dateUtils';
import { UsersIcon, XIcon, UserIcon } from './Icons';

interface TeamRosterModalProps {
  isOpen: boolean;
  members: (Member & { log_count?: number })[];
  onClose: () => void;
}

export function TeamRosterModal({ isOpen, members, onClose }: TeamRosterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-neutral-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <UsersIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Project Team Members</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Member List */}
        <div className="overflow-y-auto py-3 space-y-2.5 flex-1 pr-1">
          {members.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">No members registered yet.</p>
          ) : (
            members.map((m) => {
              const isToday = isISTToday(m.last_active_at);

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80 gap-2.5"
                >
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                        <span className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-none">
                          {m.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono flex-shrink-0">
                          {m.username ? `@${m.username}` : m.id}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400 block truncate mt-0.5">{m.role}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block ${
                      isToday
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {isToday ? 'Active Today' : 'Earlier'}
                    </span>
                    {m.log_count !== undefined && (
                      <span className="block text-[10px] text-neutral-500 mt-0.5">
                        {m.log_count} log{m.log_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-neutral-800 text-center">
          <p className="text-xs text-neutral-500">
            Total {members.length} member{members.length === 1 ? '' : 's'} registered in NIDAR
          </p>
        </div>
      </div>
    </div>
  );
}
