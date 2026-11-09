'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Member, ProgressLog } from '@/lib/db';
import { ImageIcon, AlertCircleIcon, XIcon, PlusIcon, CheckIcon } from './Icons';

interface LogEntryFormProps {
  currentMember: Member;
  categories: string[];
  onLogCreated: (log: ProgressLog) => void;
  onAddCategory: (categoryName: string) => Promise<string>;
}

export function LogEntryForm({
  currentMember,
  categories,
  onLogCreated,
  onAddCategory,
}: LogEntryFormProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [hasBlocker, setHasBlocker] = useState(false);
  const [blockers, setBlockers] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync default category if list updates
  useEffect(() => {
    if (categories.length > 0 && (!category || category === 'General')) {
      if (!categories.includes(category)) {
        setCategory(categories[0]);
      }
    }
  }, [categories, category]);

  // Restore draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`nidar_draft_${currentMember.id}`);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.content) setContent(parsed.content);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.blockers) {
          setBlockers(parsed.blockers);
          setHasBlocker(true);
        }
      } catch (e) { /* ignore */ }
    }
  }, [currentMember.id]);

  // Auto-save draft
  useEffect(() => {
    if (content || blockers) {
      localStorage.setItem(
        `nidar_draft_${currentMember.id}`,
        JSON.stringify({ content, blockers, category })
      );
    }
  }, [content, blockers, category, currentMember.id]);

  // Clean previews on unmount
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p));
    };
  }, [previews]);

  // Handle adding new custom category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) return;

    try {
      const added = await onAddCategory(newCategoryInput.trim());
      setCategory(added);
      setNewCategoryInput('');
      setIsAddingCategory(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add category');
    }
  };

  // Handle file addition
  const addFiles = (newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  // Handle clipboard paste (Ctrl+V) for screenshots
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const renamedFile = new File([file], `screenshot_${Date.now()}.png`, { type: file.type });
          pastedFiles.push(renamedFile);
        }
      }
    }

    if (pastedFiles.length > 0) {
      addFiles(pastedFiles);
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('memberId', currentMember.id);
      formData.append('content', content.trim());
      formData.append('category', category || 'General');
      if (hasBlocker && blockers.trim()) {
        formData.append('blockers', blockers.trim());
      }
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/logs', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit log');
      }

      // Reset form
      setContent('');
      setBlockers('');
      setHasBlocker(false);
      previews.forEach((p) => URL.revokeObjectURL(p));
      setFiles([]);
      setPreviews([]);
      localStorage.removeItem(`nidar_draft_${currentMember.id}`);

      onLogCreated(data.log);
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm text-neutral-100 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h2 className="text-sm font-semibold text-white">Log Today&apos;s Progress</h2>
        </div>

        {/* Dynamic Category Selector & Creation */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-neutral-400">Category:</span>
          
          {isAddingCategory ? (
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="New category..."
                autoFocus
                className="bg-neutral-950 border border-blue-500 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none w-32"
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
                className="p-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition"
                title="Save Category"
              >
                <CheckIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-md transition"
                title="Cancel"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <select
                id="logCategory"
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsAddingCategory(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
              >
                {categories.length === 0 && (
                  <option value="General">General</option>
                )}
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__NEW__">+ Add New Category...</option>
              </select>

              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition border border-neutral-800"
                title="Add a custom category"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl mb-3 flex items-center space-x-2">
          <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder="What did you accomplish today? Any outcomes, links, or learnings? (Tip: Paste screenshots directly with Ctrl+V)"
            rows={3}
            required
            className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 transition text-sm resize-y"
          />
        </div>

        {/* Blocker Toggle & Input */}
        <div>
          <div className="flex items-center space-x-2">
            <input
              id="blockerCheckbox"
              type="checkbox"
              checked={hasBlocker}
              onChange={(e) => setHasBlocker(e.target.checked)}
              className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="blockerCheckbox" className="text-xs text-neutral-300 cursor-pointer flex items-center space-x-1">
              <span className={hasBlocker ? 'text-amber-400 font-medium' : 'text-neutral-400'}>
                I have a blocker / need assistance
              </span>
            </label>
          </div>

          {hasBlocker && (
            <input
              type="text"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Describe the blocker (e.g. Waiting on API endpoint, sensor driver bug, review pending...)"
              className="mt-2 w-full px-3.5 py-2 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-200 placeholder:text-amber-500/50 text-xs focus:outline-none focus:border-amber-400"
            />
          )}
        </div>

        {/* Uploaded File Previews */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {previews.map((preview, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border border-neutral-700 bg-neutral-950 w-20 h-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`Upload preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition"
                  title="Remove image"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-700 transition"
            >
              <ImageIcon className="w-4 h-4 text-neutral-400" />
              <span>Attach Screenshots ({files.length})</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <span>{submitting ? 'Posting...' : 'Post Update'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
