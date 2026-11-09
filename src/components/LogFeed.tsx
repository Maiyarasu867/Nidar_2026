'use client';

import React, { useState, useMemo } from 'react';
import { Member, ProgressLog } from '@/lib/db';
import { formatISTTime, formatISTDate, getISTDateLabel, isISTToday } from '@/lib/dateUtils';
import {
  SearchIcon,
  CopyIcon,
  CheckIcon,
  ThumbsUpIcon,
  TrashIcon,
  AlertCircleIcon,
  ZoomInIcon,
  ImageIcon,
  EditIcon,
  XIcon,
} from './Icons';

interface LogFeedProps {
  logs: ProgressLog[];
  currentMember: Member;
  members: Member[];
  categories?: string[];
  onOpenLightbox: (src: string, alt: string, note?: string | null) => void;
  onDeleteLog: (id: number) => void;
  onUpdateLog: (updatedLog: ProgressLog) => void;
  onToggleReaction: (logId: number) => void;
}

export function LogFeed({
  logs,
  currentMember,
  members,
  categories: propCategories = [],
  onOpenLightbox,
  onDeleteLog,
  onUpdateLog,
  onToggleReaction,
}: LogFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedStandup, setCopiedStandup] = useState(false);

  // Edit state
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editBlockers, setEditBlockers] = useState('');
  const [editHasBlocker, setEditHasBlocker] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editAttachmentNotes, setEditAttachmentNotes] = useState<Record<number, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Combined categories list
  const allCategories = useMemo(() => {
    const set = new Set<string>(propCategories);
    logs.forEach((l) => set.add(l.category));
    return ['ALL', ...Array.from(set)];
  }, [logs, propCategories]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchMember = selectedMember === 'ALL' || log.member_id === selectedMember;
      const matchCategory = selectedCategory === 'ALL' || log.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.blockers && log.blockers.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.member_username && log.member_username.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchMember && matchCategory && matchSearch;
    });
  }, [logs, selectedMember, selectedCategory, searchQuery]);

  // Group logs by Indian Standard Time (IST) date string
  const groupedLogs = useMemo(() => {
    const groups: { [dateLabel: string]: ProgressLog[] } = {};

    filteredLogs.forEach((log) => {
      const label = getISTDateLabel(log.created_at);
      if (!groups[label]) groups[label] = [];
      groups[label].push(log);
    });

    return groups;
  }, [filteredLogs]);

  // Start editing a log
  const handleStartEdit = (log: ProgressLog) => {
    setEditingLogId(log.id);
    setEditContent(log.content);
    setEditBlockers(log.blockers || '');
    setEditHasBlocker(!!log.blockers);
    setEditCategory(log.category);
    const notesMap: Record<number, string> = {};
    log.attachments?.forEach((att) => {
      notesMap[att.id] = att.note || '';
    });
    setEditAttachmentNotes(notesMap);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (logId: number) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: currentMember.id,
          content: editContent.trim(),
          blockers: editHasBlocker ? editBlockers.trim() : null,
          category: editCategory,
          attachmentNotes: editAttachmentNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update log');
      }

      onUpdateLog(data.log);
      setEditingLogId(null);
    } catch (err: any) {
      setEditError(err.message || 'Error updating log');
    } finally {
      setSavingEdit(false);
    }
  };

  // Generate and copy today's standup summary
  const handleCopyStandup = () => {
    const todayLogs = groupedLogs['Today'] || [];
    if (todayLogs.length === 0) {
      alert("No progress logs recorded for Today yet.");
      return;
    }

    let summary = `📋 *NIDAR Project Progress Update — ${formatISTDate(new Date())} (IST)*\n\n`;
    todayLogs.forEach((l) => {
      summary += `👤 *${l.member_name}* (@${l.member_username || l.member_id}, ${l.member_role})\n`;
      summary += `• Category: [${l.category}]\n`;
      summary += `• Progress (${formatISTTime(l.created_at)} IST): ${l.content}\n`;
      if (l.blockers) {
        summary += `• ⚠️ Blocker: ${l.blockers}\n`;
      }
      if (l.attachments && l.attachments.length > 0) {
        l.attachments.forEach((att, idx) => {
          if (att.note) {
            summary += `  📸 Screenshot ${idx + 1}: ${att.note}\n`;
          }
        });
      }
      summary += `\n`;
    });

    navigator.clipboard.writeText(summary);
    setCopiedStandup(true);
    setTimeout(() => setCopiedStandup(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Toolbar - Optimized for Mobile & Desktop */}
      <div className="flex flex-col gap-2.5 bg-neutral-900/60 border border-neutral-800/80 p-3 rounded-2xl">
        <div className="w-full relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search progress logs, teammates, blockers..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 placeholder:text-neutral-600 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          {/* Member filter */}
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full sm:w-auto bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-500 truncate"
          >
            <option value="ALL">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (@{m.username || m.id})
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-500 truncate"
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Tags' : c}</option>
            ))}
          </select>

          {/* Copy Standup Button */}
          <button
            type="button"
            onClick={handleCopyStandup}
            className="col-span-2 sm:col-span-1 w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium border border-neutral-700 transition flex-shrink-0"
            title="Copy today's updates formatted for Slack/Discord/Email"
          >
            {copiedStandup ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied to Clipboard!</span>
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
                const isToday = isISTToday(log.created_at);
                const canEdit = isOwn && isToday;
                const isEditing = editingLogId === log.id;

                const hasReacted = log.reactions?.some((r) => r.member_id === currentMember.id);
                const reactionCount = log.reactions?.length || 0;
                const reactorNames = log.reactions?.map((r) => r.member_name).join(', ') || '';

                const timeStr = formatISTTime(log.created_at);

                return (
                  <article
                    key={log.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm text-neutral-100 hover:border-neutral-700/80 transition"
                  >
                    {isEditing ? (
                      /* Inline Edit Mode */
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-xs font-semibold text-white uppercase tracking-wider">
                              Editing Today&apos;s Progress Log
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1 text-neutral-400 hover:text-white rounded-lg transition"
                            title="Cancel editing"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>

                        {editError && (
                          <div className="p-2.5 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center space-x-2">
                            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                            <span>{editError}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-neutral-400">Category:</span>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
                          >
                            {allCategories.filter((c) => c !== 'ALL').map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          required
                          className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 text-sm resize-y"
                        />

                        {/* Blocker Edit Toggle */}
                        <div>
                          <div className="flex items-center space-x-2">
                            <input
                              id={`editBlocker-${log.id}`}
                              type="checkbox"
                              checked={editHasBlocker}
                              onChange={(e) => setEditHasBlocker(e.target.checked)}
                              className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor={`editBlocker-${log.id}`} className="text-xs text-neutral-300 cursor-pointer">
                              <span className={editHasBlocker ? 'text-amber-400 font-medium' : 'text-neutral-400'}>
                                Blocker / Need assistance
                              </span>
                            </label>
                          </div>

                          {editHasBlocker && (
                            <input
                              type="text"
                              value={editBlockers}
                              onChange={(e) => setEditBlockers(e.target.value)}
                              placeholder="Describe your blocker..."
                              className="mt-2 w-full px-3 py-1.5 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-200 placeholder:text-amber-500/50 text-xs focus:outline-none focus:border-amber-400"
                            />
                          )}
                        </div>

                        {/* Edit notes for screenshots */}
                        {log.attachments && log.attachments.length > 0 && (
                          <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                              Screenshot Captions & Notes
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {log.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="flex items-center space-x-2 p-2 rounded-xl bg-neutral-950 border border-neutral-800"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={att.file_url}
                                    alt={att.file_name}
                                    className="w-12 h-12 object-cover rounded-lg border border-neutral-700 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={editAttachmentNotes[att.id] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditAttachmentNotes((prev) => ({
                                          ...prev,
                                          [att.id]: val,
                                        }));
                                      }}
                                      placeholder="Add note for screenshot..."
                                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-600 text-xs focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-800">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={savingEdit}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(log.id)}
                            disabled={savingEdit || !editContent.trim()}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow transition"
                          >
                            {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal View Mode */
                      <>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-start space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                            {/* Member Avatar / Initial */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow flex-shrink-0 mt-0.5">
                              {log.member_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                                <span className="font-semibold text-sm text-white truncate max-w-[140px] sm:max-w-none">
                                  {log.member_name}
                                </span>
                                <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium">
                                  {log.member_role}
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                                  {log.member_username ? `@${log.member_username}` : log.member_id}
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-400 block mt-0.5">
                                {timeStr} IST • <span className="text-blue-400 font-medium">{log.category}</span>
                                {log.updated_at && (
                                  <span className="text-[10px] text-neutral-500 italic ml-1.5 font-normal">
                                    (edited)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Author Actions: Edit within that day & Delete */}
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(log)}
                                className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded-lg transition"
                                title="Edit log (allowed today)"
                              >
                                <EditIcon className="w-3.5 h-3.5" />
                              </button>
                            )}

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
                        </div>

                        {/* Blocker Banner if exists */}
                        {log.blockers && (
                          <div className="mb-3 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start space-x-2">
                            <AlertCircleIcon className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                            <div>
                              <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] block">
                                Blocker / Needs Help
                              </span>
                              <span className="mt-0.5 block break-words">{log.blockers}</span>
                            </div>
                          </div>
                        )}

                        {/* Main Log Content */}
                        <div className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed break-words">
                          {log.content}
                        </div>

                        {/* Screenshots Gallery with Notes / Captions */}
                        {log.attachments && log.attachments.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-neutral-800/70">
                            <span className="text-[11px] text-neutral-400 font-medium flex items-center space-x-1 mb-2.5">
                              <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Screenshots ({log.attachments.length}) — Click to enlarge</span>
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {log.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  onClick={() => onOpenLightbox(att.file_url, att.file_name, att.note)}
                                  className="group relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 cursor-pointer shadow-sm hover:border-blue-500/80 transition flex flex-col"
                                >
                                  <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={att.file_url}
                                      alt={att.note || att.file_name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <div className="p-2 bg-neutral-900/90 rounded-full text-white shadow-lg">
                                        <ZoomInIcon className="w-4 h-4" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Note / Caption displayed cleanly */}
                                  <div className="p-2 bg-neutral-950/95 border-t border-neutral-800/80">
                                    {att.note ? (
                                      <p className="text-xs text-neutral-200 font-medium line-clamp-2 leading-tight">
                                        {att.note}
                                      </p>
                                    ) : (
                                      <span className="text-[10px] text-neutral-500 font-mono truncate block">
                                        {att.file_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Card Footer: Reactions & Seen */}
                        <div className="mt-3.5 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
                          <div className="flex flex-wrap items-center gap-2">
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
                              <span className="text-[11px] text-neutral-500 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-md">
                                Seen by: {reactorNames}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
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
