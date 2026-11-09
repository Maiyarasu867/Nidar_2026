'use client';

import React, { useEffect, useRef, useState } from 'react';
import { XIcon, DownloadIcon, ZoomInIcon } from './Icons';

interface LightboxProps {
  isOpen: boolean;
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function Lightbox({ isOpen, src, alt, onClose }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && src) {
      setIsZoomed(false);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, src]);

  // Fallback for light-dismiss (clicking the backdrop) per modern-web-guidance
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // If target is dialog itself (the backdrop), check coordinates
    if (e.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const isContent = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isContent) {
        onClose();
      }
    }
  };

  if (!isOpen || !src) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Screenshot Preview"
      onClick={handleDialogClick}
      onClose={onClose}
      className="backdrop:bg-black/80 backdrop:backdrop-blur-sm fixed inset-0 m-auto max-w-[95vw] max-h-[95vh] bg-transparent p-0 rounded-xl overflow-hidden shadow-2xl focus:outline-none z-50 text-white"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="relative flex flex-col items-center justify-center p-2 bg-neutral-900/90 rounded-xl border border-neutral-700">
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between px-4 py-2 bg-neutral-950/80 rounded-t-lg border-b border-neutral-800 text-sm">
          <span className="text-neutral-300 font-mono text-xs truncate max-w-[300px]">
            {alt || 'Screenshot'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded transition"
              title={isZoomed ? "Original Size" : "Zoom In"}
            >
              <ZoomInIcon className="w-4 h-4" />
            </button>
            <a
              href={src}
              download={alt || 'screenshot.png'}
              className="p-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded transition"
              title="Download image"
            >
              <DownloadIcon className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-red-500/20 text-neutral-300 hover:text-red-400 rounded transition"
              title="Close (Esc)"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div 
          className={`overflow-auto max-h-[85vh] max-w-[90vw] p-2 flex items-center justify-center cursor-pointer select-none`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || 'Screenshot Preview'}
            className={`rounded object-contain transition-transform duration-200 ${
              isZoomed ? 'scale-150 max-w-none' : 'max-h-[80vh] w-auto'
            }`}
          />
        </div>
      </div>
    </dialog>
  );
}
