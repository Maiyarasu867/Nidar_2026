'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Member, ProgressLog, ChecklistItem, Meeting } from '@/lib/db';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { LogEntryForm } from '@/components/LogEntryForm';
import { LogFeed } from '@/components/LogFeed';
import { ChecklistsTab } from '@/components/ChecklistsTab';
import { MeetingsTab } from '@/components/MeetingsTab';
import { UpcomingMeetingBanner } from '@/components/UpcomingMeetingBanner';
import { Lightbox } from '@/components/Lightbox';
import { TeamRosterModal } from '@/components/TeamRosterModal';

export default function Home() {
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'checklists' | 'meetings' | 'team'>('logs');

  // Application Data
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<(Member & { log_count?: number })[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [, setDataLoading] = useState(false);

  // Modals & Lightbox
  const [lightboxData, setLightboxData] = useState<{ src: string; alt: string } | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Initial Auth Check from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nidar_member');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentMember(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse member from localStorage:', e);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  // Fetch all Hub Data
  const fetchData = useCallback(async () => {
    if (!currentMember) return;
    setDataLoading(true);

    try {
      const [logsRes, checklistsRes, meetingsRes, membersRes, categoriesRes] = await Promise.all([
        fetch('/api/logs'),
        fetch(`/api/checklists?memberId=${currentMember.id}`),
        fetch('/api/meetings'),
        fetch('/api/auth'),
        fetch('/api/categories'),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }

      if (checklistsRes.ok) {
        const data = await checklistsRes.json();
        setChecklists(data.items || []);
      }

      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings || []);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [currentMember]);

  useEffect(() => {
    if (currentMember) {
      fetchData();
    }
  }, [currentMember, fetchData]);

  // Auth Handlers
  const handleAuthSuccess = (member: Member) => {
    setCurrentMember(member);
  };

  const handleLogout = () => {
    if (confirm('Switch user or sign out of this device?')) {
      localStorage.removeItem('nidar_member');
      setCurrentMember(null);
    }
  };

  // Add Category Handler
  const handleAddCategory = async (name: string): Promise<string> => {
    const trimmed = name.trim();
    if (!trimmed) return trimmed;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      }
      return trimmed;
    } catch (e) {
      console.error('Failed to save category:', e);
      return trimmed;
    }
  };

  // Log handlers
  const handleLogCreated = (newLog: ProgressLog) => {
    setLogs((prev) => [newLog, ...prev]);
    if (newLog.category && !categories.includes(newLog.category)) {
      setCategories((prev) => [...prev, newLog.category]);
    }
    fetchData(); // refresh counts and activity
  };

  const handleDeleteLog = async (id: number) => {
    if (!currentMember) return;
    try {
      const res = await fetch(`/api/logs?id=${id}&memberId=${currentMember.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete log:', e);
    }
  };

  const handleToggleReaction = async (logId: number) => {
    if (!currentMember) return;
    try {
      const res = await fetch(`/api/logs/${logId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: currentMember.id }),
      });
      if (res.ok) {
        const logsRes = await fetch('/api/logs');
        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.logs || []);
        }
      }
    } catch (e) {
      console.error('Failed to toggle reaction:', e);
    }
  };

  // Checklist handlers
  const handleAddChecklist = async (title: string, category: string, is_personal: number) => {
    if (!currentMember) return;
    const res = await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category: category || 'General',
        memberId: currentMember.id,
        is_personal,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setChecklists((prev) => [data.item, ...prev]);
    }
  };

  const handleToggleChecklist = async (id: number, currentCompleted: number) => {
    if (!currentMember) return;
    const newStatus = currentCompleted === 1 ? 0 : 1;
    const res = await fetch('/api/checklists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_completed: newStatus, memberId: currentMember.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setChecklists((prev) => prev.map((item) => (item.id === id ? data.item : item)));
    }
  };

  const handleDeleteChecklist = async (id: number) => {
    const res = await fetch(`/api/checklists?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setChecklists((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Meeting handlers
  const handleScheduleMeeting = async (meetingData: {
    title: string;
    agenda?: string;
    scheduled_at: string;
    duration_minutes: number;
    meeting_url?: string;
  }) => {
    if (!currentMember) return;
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...meetingData, memberId: currentMember.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setMeetings((prev) => [...prev, data.meeting].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to schedule');
    }
  };

  const handleDeleteMeeting = async (id: number) => {
    const res = await fetch(`/api/meetings?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400 text-sm font-mono">
        Loading NIDAR Hub...
      </div>
    );
  }

  // Count active team checklists for header badge
  const pendingTeamTasks = checklists.filter((c) => (!c.is_personal || c.is_personal === 0) && c.is_completed === 0).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* If not logged in, show Auth Modal */}
      {!currentMember ? (
        <AuthModal onSuccess={handleAuthSuccess} />
      ) : (
        <>
          {/* Top Header */}
          <Header
            currentMember={currentMember}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            pendingChecklistsCount={pendingTeamTasks}
            upcomingMeetingsCount={meetings.filter((m) => new Date(m.scheduled_at) >= new Date()).length}
            onOpenTeamModal={() => setIsTeamModalOpen(true)}
          />

          {/* Main App Body */}
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
            
            {/* Upcoming Meeting Banner (Always visible if meeting exists) */}
            <UpcomingMeetingBanner
              meetings={meetings}
              onOpenMeetingsTab={() => setActiveTab('meetings')}
            />

            {/* Tab: Progress Logs Feed */}
            {activeTab === 'logs' && (
              <div>
                <LogEntryForm
                  currentMember={currentMember}
                  categories={categories}
                  onLogCreated={handleLogCreated}
                  onAddCategory={handleAddCategory}
                />
                <LogFeed
                  logs={logs}
                  currentMember={currentMember}
                  members={members}
                  onOpenLightbox={(src, alt) => setLightboxData({ src, alt })}
                  onDeleteLog={handleDeleteLog}
                  onToggleReaction={handleToggleReaction}
                />
              </div>
            )}

            {/* Tab: Checklists (Personal + Team) */}
            {activeTab === 'checklists' && (
              <ChecklistsTab
                items={checklists}
                currentMember={currentMember}
                categories={categories}
                onAddItem={handleAddChecklist}
                onToggleItem={handleToggleChecklist}
                onDeleteItem={handleDeleteChecklist}
                onAddCategory={handleAddCategory}
              />
            )}

            {/* Tab: Meetings */}
            {activeTab === 'meetings' && (
              <MeetingsTab
                meetings={meetings}
                currentMember={currentMember}
                onScheduleMeeting={handleScheduleMeeting}
                onDeleteMeeting={handleDeleteMeeting}
              />
            )}

          </main>

          {/* Lightbox for Screenshots */}
          <Lightbox
            isOpen={!!lightboxData}
            src={lightboxData?.src || null}
            alt={lightboxData?.alt || ''}
            onClose={() => setLightboxData(null)}
          />

          {/* Team Roster Modal */}
          <TeamRosterModal
            isOpen={isTeamModalOpen}
            members={members}
            onClose={() => setIsTeamModalOpen(false)}
          />

          {/* Minimalist Footer */}
          <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-600">
            NIDAR Project Hub • Private Team Progress System • Internal Use Only
          </footer>
        </>
      )}

    </div>
  );
}
