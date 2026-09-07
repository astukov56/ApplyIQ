'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ParsedResumeData {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  summary?: string;
  skills?: Array<{ id: string; name: string; category: string; proficiency: string }>;
  experiences?: Array<{
    id: string;
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    highlights: string[];
  }>;
  education?: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    grade?: string;
    details?: string;
  }>;
  projects?: Array<{
    id: string;
    title: string;
    description: string;
    techStack: string[];
    liveUrl?: string;
    githubUrl?: string;
  }>;
}

interface ResumeUploadZoneProps {
  onParsed: (data: ParsedResumeData) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = ['.pdf', '.doc', '.docx'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ResumeUploadZone({ onParsed, className }: ResumeUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setErrorMsg(null);
    setErrorToast(null);
    setProgress('');
    if (inputRef.current) inputRef.current.value = '';
  };

  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => {
      setErrorToast(null);
    }, 9000);
    return () => clearTimeout(timer);
  }, [errorToast]);

  const processFile = useCallback(async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) {
      setFile(f);
      setStatus('error');
      const err = `Unsupported format ".${ext}". Please upload a .pdf, .doc, or .docx file.`;
      setErrorMsg(err);
      setErrorToast(err);
      return;
    }

    setFile(f);
    setStatus('uploading');
    setErrorMsg(null);
    setErrorToast(null);

    try {
      setProgress('Extracting text…');
      const fd = new FormData();
      fd.append('file', f);

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: fd,
      });

      setProgress('Structuring with AI…');
      let json: { success?: boolean; data?: ParsedResumeData; error?: string } = {};
      try {
        json = await res.json();
      } catch {
        json = { error: 'Failed to parse response from server' };
      }

      if (!res.ok || !json.success) {
        if (
          res.status === 401 ||
          json.error?.toLowerCase().includes('openai api key') ||
          json.error?.toLowerCase().includes('unauthorized') ||
          json.error?.toLowerCase().includes('401')
        ) {
          const authError = 'Invalid OpenAI API key. Please verify OPENAI_API_KEY in your .env.local file.';
          setErrorToast(authError);
          throw new Error(authError);
        }
        const generalError = json.error ?? 'Parse failed';
        setErrorToast(generalError);
        throw new Error(generalError);
      }

      setStatus('success');
      setProgress('');
      setErrorToast(null);
      onParsed(json.data as ParsedResumeData);
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Unexpected error during parsing.';
      setErrorMsg(msg);
      setErrorToast(msg);
    }
  }, [onParsed]);

  // Drag events
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume file — click or drag and drop"
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all duration-200 select-none',
          status === 'uploading'
            ? 'pointer-events-none border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20'
            : status === 'success'
              ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10'
              : status === 'error'
                ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/10'
                : isDragging
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          onChange={onFileChange}
          aria-hidden="true"
        />

        {/* Icon area */}
        <div
          className={clsx(
            'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
            status === 'success'
              ? 'bg-emerald-100 dark:bg-emerald-900/40'
              : status === 'error'
                ? 'bg-rose-100 dark:bg-rose-900/40'
                : status === 'uploading'
                  ? 'bg-indigo-100 dark:bg-indigo-900/40'
                  : 'bg-slate-100 dark:bg-slate-800'
          )}
        >
          {status === 'uploading' ? (
            <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          ) : status === 'error' ? (
            <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
          ) : (
            <UploadCloud className="w-7 h-7 text-slate-400 dark:text-slate-500" />
          )}
        </div>

        {/* Label text */}
        {status === 'idle' && (
          <>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isDragging ? 'Release to upload' : 'Drag & drop your resume here'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                or <span className="text-indigo-600 dark:text-indigo-400 font-semibold">click to browse</span>
              </p>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Supports .pdf, .doc, .docx · Max 10 MB
            </p>
          </>
        )}

        {status === 'uploading' && (
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              {progress || 'Processing…'}
            </p>
            <p className="text-xs text-slate-500">
              {file && `${file.name} (${formatBytes(file.size)})`}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Resume parsed successfully!
            </p>
            <p className="text-xs text-slate-500">
              {file && `${file.name} · ${formatBytes(file.size)}`}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              Parse failed
            </p>
            <p className="text-xs text-slate-500">
              {file && `${file.name}`}
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/60 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={reset} className="shrink-0 rounded p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Accepted formats info */}
      {status === 'idle' && (
        <div className="flex items-center gap-3">
          {ACCEPTED_MIME.map((mime, i) => {
            const labels = ['PDF', 'DOC', 'DOCX'];
            const icons = ['📄', '📝', '📝'];
            return (
              <span key={mime} className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <span>{icons[i]}</span>
                <span>{labels[i]}</span>
              </span>
            );
          })}
          <span className="ml-auto">
            {file && (
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </span>
        </div>
      )}

      {/* Success actions */}
      {status === 'success' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <FileText className="w-3.5 h-3.5" />
            <span>Fields pre-filled from your resume</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-3 h-3" />
            Upload different file
          </button>
        </div>
      )}

      {/* Floating Error Toast Notification */}
      {errorToast && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 right-6 z-[9999] max-w-md w-[calc(100vw-3rem)] p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white border border-rose-500/50 shadow-2xl shadow-rose-950/40 backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-start gap-3"
        >
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              {errorToast.includes('OpenAI') ? 'API Key Configuration Error' : 'Upload & Parse Notice'}
            </p>
            <p className="text-xs text-slate-100 font-medium mt-1 leading-relaxed">
              {errorToast}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setErrorToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Dismiss error notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
