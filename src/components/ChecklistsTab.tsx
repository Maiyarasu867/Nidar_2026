'use client';

import React, { useState, useEffect } from 'react';
import { Member, ChecklistItem } from '@/lib/db';
import { PlusIcon, TrashIcon, CheckIcon, CheckCircleIcon, UserIcon, UsersIcon, XIcon } from './Icons';

interface ChecklistsTabProps {
  items: ChecklistItem[];
  currentMember: Member;
  categories: string[];
  onAddItem: (title: string, category: string, is_personal: number) => Promise<void>;
  onToggleItem: (id: number, currentCompleted: number) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
  onAddCategory: (categoryName: string) => Promise<string>;
}

export function ChecklistsTab({
  items,
  currentMember,
  categories,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onAddCategory,
}: ChecklistsTabProps) {
  const [checklistType, setChecklistType] = useState<'team' | 'personal'>('team');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0] || 'General');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(newCategory)) {
      setNewCategory(categories[0]);
    }
  }, [categories, newCategory]);

  // Separate team and personal items
  const teamItems = items.filter((i) => !i.is_personal || i.is_personal === 0);
  const personalItems = items.filter((i) => i.is_personal === 1 && i.created_by === currentMember.id);

  const currentList = checklistType === 'team' ? teamItems : personalItems;

  const completedCount = currentList.filter((i) => i.is_completed === 1).length;
  const totalCount = currentList.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredItems = currentList.filter((item) => {
    if (filter === 'pending') return item.is_completed === 0;
    if (filter === 'completed') return item.is_completed === 1;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
      const isPersonal = checklistType === 'personal' ? 1 : 0;
      await onAddItem(newTitle.trim(), newCategory || 'General', isPersonal);
      setNewTitle('');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) return;

    try {
      const added = await onAddCategory(newCategoryInput.trim());
      setNewCategory(added);
      setNewCategoryInput('');
      setIsAddingCategory(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Switch between Team Checklist and Personal Checklist */}
      <div className="flex rounded-2xl bg-neutral-900 border border-neutral-800 p-1.5 text-xs sm:text-sm font-medium">
        <button
          type="button"
          onClick={() => { setChecklistType('team'); setFilter('all'); }}
          className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
            checklistType === 'team'
              ? 'bg-neutral-800 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <UsersIcon className="w-4 h-4 text-blue-400" />
          <span>Team Checklist ({teamItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setChecklistType('personal'); setFilter('all'); }}
          className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
            checklistType === 'personal'
              ? 'bg-neutral-800 text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <UserIcon className="w-4 h-4 text-emerald-400" />
          <span>My Personal Checklist ({personalItems.length})</span>
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm text-neutral-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              <span>
                {checklistType === 'team' ? 'Project Team Checklist' : 'My Personal Checklist'}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {checklistType === 'team'
                ? 'Shared sprint tasks visible and updateable by all project members.'
                : `Private action items only visible to you (${currentMember.name}).`}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-neutral-400 font-mono">
              {completedCount} / {totalCount} completed ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Add New Task Form */}
      <form onSubmit={handleAdd} className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={checklistType === 'team' ? "Add a new team sprint task..." : "Add a personal to-do item..."}
          required
          className="w-full sm:flex-1 px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 placeholder:text-neutral-600 text-xs focus:outline-none focus:border-blue-500"
        />

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Category Dropdown or Custom Input */}
          {isAddingCategory ? (
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="New tag..."
                autoFocus
                className="bg-neutral-950 border border-blue-500 text-white text-xs rounded-xl px-2 py-1.5 focus:outline-none w-28"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCategory(e);
                  } else if (e.key === 'Escape') {
                    setIsAddingCategory(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              >
                <CheckIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <select
                value={newCategory}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsAddingCategory(true);
                  } else {
                    setNewCategory(e.target.value);
                  }
                }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-500"
              >
                {categories.length === 0 && <option value="General">General</option>}
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__NEW__">+ Custom Tag...</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newTitle.trim()}
            className="inline-flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition flex-shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add to {checklistType === 'team' ? 'Team' : 'Personal'}</span>
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 text-xs">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-medium transition ${
            filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-xl font-medium transition ${
            filter === 'pending' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Active ({totalCount - completedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-xl font-medium transition ${
            filter === 'completed' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Checklist items list */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 text-neutral-500 text-xs">
            {checklistType === 'team'
              ? 'No team tasks in this view. Add one above!'
              : 'No personal tasks in this view. Keep your daily priorities organized here!'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCompleted = item.is_completed === 1;

            return (
              <div
                key={item.id}
                className={`group flex items-start justify-between p-3.5 rounded-xl border transition ${
                  isCompleted
                    ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-100 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1">
                  {/* Custom Checkbox button */}
                  <button
                    type="button"
                    onClick={() => onToggleItem(item.id, item.is_completed)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-neutral-600 hover:border-neutral-400 bg-neutral-950'
                    }`}
                    title={isCompleted ? "Mark active" : "Mark completed"}
                  >
                    {isCompleted && <CheckIcon className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs sm:text-sm font-medium ${isCompleted ? 'line-through text-neutral-500' : 'text-white'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                        {item.category}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 mt-1 flex flex-wrap items-center gap-x-2">
                      {checklistType === 'team' && (
                        <span>Added by {item.created_by_name || item.created_by}</span>
                      )}
                      {isCompleted && item.completed_by_name && (
                        <span className="text-emerald-400">
                          • Completed by {item.completed_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
                  title="Remove task"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
