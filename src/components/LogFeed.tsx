'use client';

import React, { useState, useMemo } from 'react';
import { Member, ProgressLog } from '@/lib/db';
import {
  SearchIcon,
  CopyIcon,
  CheckIcon,
  ThumbsUpIcon,
  TrashIcon,
  AlertCircleIcon,
  ZoomInIcon,
  ImageIcon,
} from './Icons';

interface LogFeedProps {
  logs: ProgressLog[];
  currentMember: Member;
  members: Member[];
  onOpenLightbox: (src: string, alt: string) => void;
  onDeleteLog: (id: number) => void;
  onToggleReaction: (logId: number) => void;
}

export function LogFeed({
  logs,
  currentMember,
  members,
  onOpenLightbox,
  onDeleteLog,
  onToggleReaction,
}: LogFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedStandup, setCopiedStandup] = useState(false);

  // Categories list derived from logs
  const categories = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.category));
    return ['ALL', ...Array.from(set)];
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchMember = selectedMember === 'ALL' || log.member_id === selectedMember;
      const matchCategory = selectedCategory === 'ALL' || log.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.blockers && log.blockers.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.member_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMember && matchCategory && matchSearch;
    });
  }, [logs, selectedMember, selectedCategory, searchQuery]);

  // Group logs by date string
  const groupedLogs = useMemo(() => {
    const groups: { [dateLabel: string]: ProgressLog[] } = {};

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredLogs.forEach((log) => {
      const d = new Date(log.created_at);
      const dStr = d.toDateString();
      let label = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (dStr === todayStr) label = 'Today';
      else if (dStr === yesterdayStr) label = 'Yesterday';

      if (!groups[label]) groups[label] = [];
      groups[label].push(log);
    });

    return groups;
  }, [filteredLogs]);

  // Generate and copy today's standup summary
  const handleCopyStandup = () => {
    const todayLogs = groupedLogs['Today'] || [];
    if (todayLogs.length === 0) {
      alert("No progress logs recorded for Today yet.");
      return;
    }

    let summary = `📋 *NIDAR Project Progress Update — ${new Date().toLocaleDateString()}*\n\n`;
    todayLogs.forEach((l) => {
      summary += `👤 *${l.member_name}* (${l.member_role})\n`;
      summary += `• Category: [${l.category}]\n`;
      summary += `• Progress: ${l.content}\n`;
      if (l.blockers) {
        summary += `• ⚠️ Blocker: ${l.blockers}\n`;
      }
      summary += `\n`;
    });

    navigator.clipboard.writeText(summary);
    setCopiedStandup(true);
    setTimeout(() => setCopiedStandup(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 p-3 rounded-2xl">
        <div className="flex-1 relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search progress logs, teammates, blockers..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 placeholder:text-neutral-600 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Member filter */}
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Tags' : c}</option>
            ))}
          </select>

          {/* Copy Standup Button */}
          <button
            type="button"
            onClick={handleCopyStandup}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium border border-neutral-700 transition flex-shrink-0"
            title="Copy today's updates formatted for Slack/Discord/Email"
          >
            {copiedStandup ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy Standup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Log Feed Entries Grouped by Date */}
      {Object.keys(groupedLogs).length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30">
          <p className="text-neutral-400 text-sm">No progress logs found.</p>
          <p className="text-neutral-600 text-xs mt-1">Be the first to post today&apos;s update above!</p>
        </div>
      ) : (
        Object.entries(groupedLogs).map(([dateLabel, dateLogs]) => (
          <div key={dateLabel} className="space-y-4">
            
            {/* Date Section Header */}
            <div className="flex items-center space-x-3 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                {dateLabel}
              </span>
              <div className="flex-1 h-px bg-neutral-800/80" />
            </div>

            {/* List of cards for this date */}
            <div className="space-y-3">
              {dateLogs.map((log) => {
                const isOwn = log.member_id === currentMember.id;
                const hasReacted = log.reactions?.some((r) => r.member_id === currentMember.id);
                const reactionCount = log.reactions?.length || 0;
                const reactorNames = log.reactions?.map((r) => r.member_name).join(', ') || '';

                const timeStr = new Date(log.created_at).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <article
                    key={log.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm text-neutral-100 hover:border-neutral-700/80 transition"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {/* Member Avatar / Initial */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow">
                          {log.member_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-white">
                              {log.member_name}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium">
                              {log.member_role}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                              {log.member_id}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            {timeStr} • <span className="text-blue-400">{log.category}</span>
                          </span>
                        </div>
                      </div>

                      {/* Delete action if author */}
                      {isOwn && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this progress update?')) {
                              onDeleteLog(log.id);
                            }
                          }}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
                          title="Delete my update"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Blocker Banner if exists */}
                    {log.blockers && (
                      <div className="mb-3 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start space-x-2">
                        <AlertCircleIcon className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] block">
                            Blocker / Needs Help
                          </span>
                          <span className="mt-0.5 block">{log.blockers}</span>
                        </div>
                      </div>
                    )}

                    {/* Main Log Content */}
                    <div className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">
                      {log.content}
                    </div>

                    {/* Screenshots Gallery (Visible to everyone) */}
                    {log.attachments && log.attachments.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-neutral-800/70">
                        <span className="text-[11px] text-neutral-400 font-medium flex items-center space-x-1 mb-2">
                          <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Screenshots ({log.attachments.length}) — Click to enlarge</span>
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {log.attachments.map((att) => (
                            <div
                              key={att.id}
                              onClick={() => onOpenLightbox(att.file_url, att.file_name)}
                              className="group relative rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 cursor-pointer aspect-video shadow-sm hover:border-blue-500 transition"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <div className="p-2 bg-neutral-900/90 rounded-full text-white shadow-lg">
                                  <ZoomInIcon className="w-4 h-4" />
                                </div>
                              </div>
                              <span className="absolute bottom-1 left-1.5 right-1.5 text-[10px] text-neutral-300 bg-black/75 px-1.5 py-0.5 rounded truncate font-mono">
                                {att.file_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card Footer: Reactions & Seen */}
                    <div className="mt-3.5 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => onToggleReaction(log.id)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition ${
                            hasReacted
                              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 font-medium'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                          }`}
                          title="Acknowledge / thumbs up update"
                        >
                          <ThumbsUpIcon className="w-3.5 h-3.5" />
                          <span>{reactionCount > 0 ? reactionCount : 'Acknowledge'}</span>
                        </button>

                        {reactionCount > 0 && (
                          <span className="text-[11px] text-neutral-500 truncate max-w-[200px] sm:max-w-md">
                            Seen by: {reactorNames}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))
      )}

    </div>
  );
}
