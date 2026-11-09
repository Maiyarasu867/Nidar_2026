'use client';

import React, { useMemo } from 'react';
import { Meeting } from '@/lib/db';
import { formatISTDate, formatISTTime } from '@/lib/dateUtils';
import { CalendarIcon, ExternalLinkIcon, ClockIcon } from './Icons';

interface UpcomingMeetingBannerProps {
  meetings: Meeting[];
  onOpenMeetingsTab?: () => void;
}

export function UpcomingMeetingBanner({ meetings }: UpcomingMeetingBannerProps) {
  // Find next upcoming meeting
  const nextMeeting = useMemo(() => {
    const now = new Date();
    const upcoming = meetings
      .filter((m) => new Date(m.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    return upcoming[0] || null;
  }, [meetings]);

  if (!nextMeeting) return null;

  const meetingDate = new Date(nextMeeting.scheduled_at);
  const now = new Date();
  const diffMs = meetingDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let timeUntilStr = '';
  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    timeUntilStr = `in ${days} day${days > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    timeUntilStr = `in ${diffHours}h ${diffMins}m`;
  } else if (diffMins > 0) {
    timeUntilStr = `in ${diffMins} minutes`;
  } else {
    timeUntilStr = 'starting now!';
  }

  // Google Calendar Link generator
  const createGoogleCalendarUrl = () => {
    const startIso = meetingDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(meetingDate.getTime() + (nextMeeting.duration_minutes || 30) * 60000);
    const endIso = end.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(nextMeeting.title);
    const details = encodeURIComponent(nextMeeting.agenda || 'NIDAR Project Sync');
    const loc = encodeURIComponent(nextMeeting.meeting_url || 'Online');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${loc}`;
  };

  return (
    <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-neutral-900 to-indigo-950/60 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-neutral-100 shadow-md">
      <div className="flex items-start space-x-2.5 sm:space-x-3 flex-1 min-w-0">
        <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/20 text-blue-400 mt-0.5 flex-shrink-0">
          <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
              Upcoming Sync • {timeUntilStr}
            </span>
          </div>
          <h3 className="font-semibold text-white text-sm sm:text-base mt-1 break-words">
            {nextMeeting.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-neutral-400 flex flex-wrap items-center gap-1.5 mt-0.5">
            <ClockIcon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
            <span>
              {formatISTDate(nextMeeting.scheduled_at)} at{' '}
              {formatISTTime(nextMeeting.scheduled_at)} IST ({nextMeeting.duration_minutes}m)
            </span>
            {nextMeeting.created_by_name && (
              <span>• by {nextMeeting.created_by_name}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 w-full sm:w-auto pt-1 sm:pt-0 border-t border-neutral-800/60 sm:border-0">
        {nextMeeting.meeting_url && (
          <a
            href={nextMeeting.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <span>Join Call</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </a>
        )}
        <a
          href={createGoogleCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-700 transition"
          title="Add to Google Calendar"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>+ Cal</span>
        </a>
      </div>
    </div>
  );
}
