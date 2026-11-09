'use client';

import React, { useState } from 'react';
import { Member, Meeting } from '@/lib/db';
import { formatISTDate, formatISTTime, isISTToday } from '@/lib/dateUtils';
import { CalendarIcon, ClockIcon, PlusIcon, ExternalLinkIcon, TrashIcon, AlertCircleIcon } from './Icons';

interface MeetingsTabProps {
  meetings: Meeting[];
  currentMember: Member;
  onScheduleMeeting: (meeting: {
    title: string;
    agenda?: string;
    scheduled_at: string;
    duration_minutes: number;
    meeting_url?: string;
  }) => Promise<void>;
  onDeleteMeeting: (id: number) => Promise<void>;
}

export function MeetingsTab({
  meetings,
  onScheduleMeeting,
  onDeleteMeeting,
}: MeetingsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const upcomingMeetings = meetings.filter((m) => new Date(m.scheduled_at) >= now);
  const pastMeetings = meetings.filter((m) => new Date(m.scheduled_at) < now);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;

    setError(null);
    setLoading(true);

    try {
      await onScheduleMeeting({
        title: title.trim(),
        agenda: agenda.trim() || undefined,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        meeting_url: meetingUrl.trim() || undefined,
      });

      setTitle('');
      setAgenda('');
      setScheduledAt('');
      setMeetingUrl('');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const getCalendarLink = (m: Meeting) => {
    const meetingDate = new Date(m.scheduled_at);
    const startIso = meetingDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(meetingDate.getTime() + (m.duration_minutes || 30) * 60000);
    const endIso = end.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const titleEnc = encodeURIComponent(m.title);
    const detailsEnc = encodeURIComponent(m.agenda || 'NIDAR Project Sync');
    const locEnc = encodeURIComponent(m.meeting_url || 'Online');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleEnc}&dates=${startIso}/${endIso}&details=${detailsEnc}&location=${locEnc}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm text-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            <span>Team Meetings & Syncs</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Coordinate team standups, milestone reviews, and tech syncs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{showForm ? 'Cancel' : 'Schedule Meeting'}</span>
        </button>
      </div>

      {/* Schedule Meeting Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 p-4 sm:p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Schedule New Project Meeting</h3>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label htmlFor="meetingTitle" className="block text-xs font-medium text-neutral-300 mb-1">
                Meeting Title *
              </label>
              <input
                id="meetingTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Architecture Review"
                required
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="meetingDate" className="block text-xs font-medium text-neutral-300 mb-1">
                Date & Time *
              </label>
              <input
                id="meetingDate"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label htmlFor="meetingDuration" className="block text-xs font-medium text-neutral-300 mb-1">
                Duration (minutes)
              </label>
              <select
                id="meetingDuration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>

            <div>
              <label htmlFor="meetingLink" className="block text-xs font-medium text-neutral-300 mb-1">
                Meeting Link (Google Meet / Zoom / Teams)
              </label>
              <input
                id="meetingLink"
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="meetingAgenda" className="block text-xs font-medium text-neutral-300 mb-1">
              Agenda / Discussion Points (Optional)
            </label>
            <textarea
              id="meetingAgenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="What will be reviewed? Preparation needed?"
              rows={2}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-xl text-xs hover:bg-neutral-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition"
            >
              {loading ? 'Scheduling...' : 'Save Meeting'}
            </button>
          </div>
        </form>
      )}

      {/* Upcoming Meetings Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Upcoming Meetings ({upcomingMeetings.length})
        </h3>

        {upcomingMeetings.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 text-neutral-500 text-xs">
            No upcoming meetings scheduled. Click &quot;Schedule Meeting&quot; above.
          </div>
        ) : (
          upcomingMeetings.map((m) => {
            const isToday = isISTToday(m.scheduled_at);

            return (
              <div
                key={m.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-neutral-700 transition"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {isToday && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono flex-shrink-0">
                        Today
                      </span>
                    )}
                    <h4 className="font-semibold text-white text-sm sm:text-base break-words">
                      {m.title}
                    </h4>
                  </div>

                  <p className="text-[11px] sm:text-xs text-neutral-400 flex flex-wrap items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                    <span>
                      {formatISTDate(m.scheduled_at)} at{' '}
                      {formatISTTime(m.scheduled_at)} IST ({m.duration_minutes} min)
                    </span>
                    <span>• by {m.created_by_name || m.created_by}</span>
                  </p>

                  {m.agenda && (
                    <p className="text-xs text-neutral-300 pt-1 break-words">
                      {m.agenda}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t border-neutral-800/60 sm:border-0 justify-end sm:justify-start">
                  {m.meeting_url && (
                    <a
                      href={m.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                    >
                      <span>Join Call</span>
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <a
                    href={getCalendarLink(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-700 transition"
                    title="Add to Google Calendar"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>+ Cal</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this scheduled meeting?')) {
                        onDeleteMeeting(m.id);
                      }
                    }}
                    className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
                    title="Delete meeting"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Past Meetings Section */}
      {pastMeetings.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-neutral-800/80">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Past Meetings ({pastMeetings.length})
          </h3>

          <div className="space-y-2">
            {pastMeetings.map((m) => (
              <div
                key={m.id}
                className="bg-neutral-950/40 border border-neutral-850 p-3 rounded-xl flex items-center justify-between text-xs text-neutral-400"
              >
                <div>
                  <span className="font-medium text-neutral-300 mr-2">{m.title}</span>
                  <span className="text-[11px] text-neutral-500">
                    {formatISTDate(m.scheduled_at)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteMeeting(m.id)}
                  className="text-neutral-600 hover:text-red-400 transition"
                  title="Remove from history"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
