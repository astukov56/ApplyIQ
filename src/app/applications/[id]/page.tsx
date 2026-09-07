'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ApplicationStatus, toKanbanStatus } from '@/types';
import { AIAnalysisPlaceholders } from '@/components/applications/AIAnalysisPlaceholders';
import { ApplicationFormModal } from '@/components/applications/ApplicationFormModal';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Select } from '@/components/ui';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  DollarSign,
  Edit,
  Trash2,
  Sparkles,
  FileText,
  Clock,
  Briefcase,
  Wand2,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/dateUtils';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getApplication, updateApplicationStatus, deleteApplication, discoveredJobs } = useApp();

  const appId = params?.id as string;
  const application = getApplication(appId);

  // Check matching discovered job for archival status or links
  const matchedDiscoveredJob = discoveredJobs.find(
    (j) =>
      (j.company || j.companyName || '').toLowerCase() === application?.companyName.toLowerCase() &&
      (j.title || j.jobTitle || '').toLowerCase() === application?.jobTitle.toLowerCase()
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'description' | 'notes'>('ai');

  if (!application) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <Briefcase className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Application Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested application ID does not exist or may have been removed.
        </p>
        <Link href="/applications">
          <Button variant="primary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Applications
          </Button>
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the application for ${application.jobTitle} at ${application.companyName}?`)) {
      deleteApplication(application.id);
      router.push('/applications');
    }
  };

  const isArchived =
    matchedDiscoveredJob?.postingStatus === 'Expired' ||
    matchedDiscoveredJob?.postingStatus === 'Archived' ||
    matchedDiscoveredJob?.postingStatus === 'Unavailable';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Back link & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/applications"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </Link>

        <div className="flex items-center gap-2">
          {matchedDiscoveredJob && (
            <>
              <Link href={`/resume/tailor/${matchedDiscoveredJob.id}`}>
                <Button variant="outline" size="sm" icon={<Wand2 className="w-3.5 h-3.5" />}>
                  Tailored Resume
                </Button>
              </Link>
              <Link href={`/cover-letter/${matchedDiscoveredJob.id}`}>
                <Button variant="outline" size="sm" icon={<FileText className="w-3.5 h-3.5" />}>
                  Cover Letter
                </Button>
              </Link>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            icon={<Edit className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Archival Warning Banner if Posting is Expired / Archived */}
      {isArchived && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold">
              This job posting is no longer available. You are viewing the archived copy saved by ApplyIQ.
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              The external job post has expired. All requirements, interview notes, and match analyses remain safely preserved in your workspace.
            </p>
          </div>
        </div>
      )}

      {/* Main Header Banner Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Company & Job Title */}
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {application.companyName}
              </span>
              <StatusBadge status={application.status} size="md" />
              {application.workType && (
                <Badge variant="neutral" size="md">
                  {application.workType}
                </Badge>
              )}
              {isArchived && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                  Archived Listing
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {application.jobTitle}
            </h1>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Applied: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatDate(application.applicationDate)}</strong>
              </span>

              {application.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {application.location}
                </span>
              )}

              {application.salary && (
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  {application.salary}
                </span>
              )}

              {application.jobUrl && (
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Original Job Advertisement</span>
                </a>
              )}
            </div>
          </div>

          {/* Quick Status Selector */}
          <div className="lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-6 space-y-2 shrink-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Application Stage
            </label>
            <select
              value={toKanbanStatus(application.status)}
              onChange={(e) =>
                updateApplicationStatus(application.id, e.target.value as ApplicationStatus)
              }
              className="w-full sm:w-48 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="wishlist">Wishlist (Saved)</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer Received</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs (AI Analysis / Job Description / Notes) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Intelligence & Fit</span>
          {application.aiAnalysis && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {application.aiAnalysis.matchScore}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('description')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'description'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Job Description</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Notes & Activity</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'ai' && (
        <AIAnalysisPlaceholders
          analysis={application.aiAnalysis}
          jobTitle={application.jobTitle}
          companyName={application.companyName}
        />
      )}

      {activeTab === 'description' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Full Job Advertisement</CardTitle>
          </CardHeader>
          <CardContent>
            {application.jobDescription ? (
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {application.jobDescription}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No job description was entered for this role. Click &quot;Edit&quot; to paste the advertisement text.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Personal Notes & Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.notes ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                {application.notes}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No notes added yet. Use notes to record interview details, contact names, or preparation pointers.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <ApplicationFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={application}
      />
    </div>
  );
}
