'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ApplicationStatus,
  JobApplication,
  ApplicationCard,
  KanbanStatus,
  toApplicationCard,
  toKanbanStatus,
  KANBAN_COLUMNS,
} from '@/types';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { ApplicationFormModal } from '@/components/applications/ApplicationFormModal';
import { ApplicationDetailDrawer } from '@/components/applications/ApplicationDetailDrawer';
import { KanbanBoard } from '@/components/applications/kanban/KanbanBoard';
import { Button, Card, CardContent, Input, Badge } from '@/components/ui';
import {
  Plus,
  Search,
  Building2,
  ExternalLink,
  Calendar,
  MapPin,
  Sparkles,
  Trash2,
  Edit,
  ChevronRight,
  Kanban,
  List,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Award,
  FileText,
  Mail,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/dateUtils';

type ViewMode = 'kanban' | 'list';

export default function ApplicationsPage() {
  const { applications, updateApplicationStatus, deleteApplication, resumes, coverLetters } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<KanbanStatus | 'all'>('all');

  // Modal & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialModalStatus, setInitialModalStatus] = useState<KanbanStatus>('applied');
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [selectedCardForDrawer, setSelectedCardForDrawer] = useState<ApplicationCard | null>(null);

  // Convert to cards
  const cards: ApplicationCard[] = useMemo(() => {
    return applications.map(toApplicationCard);
  }, [applications]);

  // Sync drawer card if applications change
  const currentDrawerCard = useMemo(() => {
    if (!selectedCardForDrawer) return null;
    const found = applications.find((a) => a.id === selectedCardForDrawer.id);
    return found ? toApplicationCard(found) : null;
  }, [applications, selectedCardForDrawer]);

  // Filtered applications for List View
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const cardStatus = toKanbanStatus(app.status);
      const matchesStatus =
        selectedStatusFilter === 'all' ? true : cardStatus === selectedStatusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.companyName.toLowerCase().includes(q) ||
        app.jobTitle.toLowerCase().includes(q) ||
        (app.location && app.location.toLowerCase().includes(q)) ||
        (app.notes && app.notes.toLowerCase().includes(q)) ||
        (app.salary && app.salary.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [applications, selectedStatusFilter, searchQuery]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = applications.length;
    const interviewing = applications.filter((a) => toKanbanStatus(a.status) === 'interviewing').length;
    const offers = applications.filter((a) => toKanbanStatus(a.status) === 'offer').length;
    const scores = applications
      .map((a) => a.aiAnalysis?.matchScore)
      .filter((s): s is number => typeof s === 'number');
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return { total, interviewing, offers, avgScore };
  }, [applications]);

  const handleOpenAddModal = (status: KanbanStatus = 'applied') => {
    setEditingApp(null);
    setInitialModalStatus(status);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (card: ApplicationCard) => {
    const fullApp = applications.find((a) => a.id === card.id) || null;
    setEditingApp(fullApp);
    setInitialModalStatus(card.status);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Application Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage stages, track interview rounds, and link tailored resume snapshots across all roles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <Button
            variant="primary"
            onClick={() => handleOpenAddModal('applied')}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Application
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Tracked
            </span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {stats.total}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
              Interviewing
            </span>
            <span className="text-xl font-extrabold text-amber-900 dark:text-amber-200">
              {stats.interviewing}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
              Offers Received
            </span>
            <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">
              {stats.offers}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
              Avg AI Match
            </span>
            <span className="text-xl font-extrabold text-indigo-900 dark:text-indigo-200">
              {stats.avgScore > 0 ? `${stats.avgScore}%` : '—'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <Input
            placeholder="Search by company, role title, location, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {viewMode === 'list' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedStatusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              All ({applications.length})
            </button>
            {KANBAN_COLUMNS.map((col) => {
              const count = applications.filter((a) => toKanbanStatus(a.status) === col.id).length;
              const isSelected = selectedStatusFilter === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedStatusFilter(col.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span>{col.title}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Board vs List View Rendering */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          searchQuery={searchQuery}
          onOpenDetails={(card) => setSelectedCardForDrawer(card)}
          onEdit={(card) => handleOpenEditModal(card)}
          onAddNew={(status) => handleOpenAddModal(status || 'wishlist')}
        />
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredApps.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  No applications match your criteria
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No jobs matched your search "${searchQuery}".`
                    : `No jobs in the selected filter.`}
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={() => handleOpenAddModal('applied')}>
                    Add Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredApps.map((app) => {
              const card = toApplicationCard(app);
              const linkedResume = app.tailoredResumeId
                ? resumes.find((r) => r.id === app.tailoredResumeId)
                : undefined;

              return (
                <Card
                  key={app.id}
                  hoverEffect
                  className="p-4 sm:p-5 transition-all cursor-pointer"
                  onClick={() => setSelectedCardForDrawer(card)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Job Title & Company */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {app.jobTitle}
                        </span>

                        {app.aiAnalysis && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            {app.aiAnalysis.matchScore}% Match
                          </span>
                        )}

                        {linkedResume && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40">
                            <FileText className="w-3 h-3 text-violet-500" />
                            Tailored CV Attached
                          </span>
                        )}

                        {app.workType && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {app.workType}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {app.companyName}
                        </span>
                        {app.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {app.location}
                          </span>
                        )}
                        {app.salary && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <DollarSign className="w-3.5 h-3.5" />
                            {app.salary}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Applied: {formatDate(app.applicationDate)}
                        </span>
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Job Post</span>
                          </a>
                        )}
                      </div>

                      {app.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800">
                          <span className="font-medium text-slate-400">Notes: </span>
                          {app.notes}
                        </p>
                      )}
                    </div>

                    {/* Status Dropdown & Action Buttons */}
                    <div
                      className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium hidden sm:inline">Stage:</span>
                        <select
                          value={toKanbanStatus(app.status)}
                          onChange={(e) =>
                            updateApplicationStatus(app.id, e.target.value as ApplicationStatus)
                          }
                          className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {KANBAN_COLUMNS.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(card)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit application"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete application for ${app.jobTitle} at ${app.companyName}?`)) {
                              deleteApplication(app.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete application"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSelectedCardForDrawer(card)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      <ApplicationDetailDrawer
        isOpen={Boolean(selectedCardForDrawer)}
        onClose={() => setSelectedCardForDrawer(null)}
        card={currentDrawerCard}
        onEdit={(card) => {
          setSelectedCardForDrawer(null);
          handleOpenEditModal(card);
        }}
      />

      {/* Add / Edit Modal */}
      <ApplicationFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingApp(null);
        }}
        initialData={editingApp}
        initialStatus={initialModalStatus}
      />
    </div>
  );
}
