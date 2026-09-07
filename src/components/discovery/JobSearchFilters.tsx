'use client';

import React from 'react';
import { JobSource, WorkArrangement, EmploymentType } from '@/types';
import { Input, Select, Button } from '@/components/ui';
import { Search, MapPin, SlidersHorizontal, RotateCcw, Sparkles } from 'lucide-react';

interface JobSearchFiltersProps {
  keyword: string;
  setKeyword: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  minMatchScore: number;
  setMinMatchScore: (val: number) => void;
  workArrangement: WorkArrangement | 'All';
  setWorkArrangement: (val: WorkArrangement | 'All') => void;
  employmentType: EmploymentType | 'All';
  setEmploymentType: (val: EmploymentType | 'All') => void;
  source: JobSource | 'All';
  setSource: (val: JobSource | 'All') => void;
  sortBy: 'match' | 'date' | 'salary';
  setSortBy: (val: 'match' | 'date' | 'salary') => void;
  onReset: () => void;
  totalMatches: number;
}

const SOURCES: (JobSource | 'All')[] = [
  'All',
  'LinkedIn',
  'SEEK',
  'Indeed',
  'Company Site',
  'GradConnection',
];

const ARRANGEMENTS: (WorkArrangement | 'All')[] = ['All', 'Remote', 'Hybrid', 'On-site'];

const EMPLOYMENT_TYPES: (EmploymentType | 'All')[] = [
  'All',
  'Full-time',
  'Graduate',
  'Internship',
  'Contract',
];

export const JobSearchFilters: React.FC<JobSearchFiltersProps> = ({
  keyword,
  setKeyword,
  location,
  setLocation,
  minMatchScore,
  setMinMatchScore,
  workArrangement,
  setWorkArrangement,
  employmentType,
  setEmploymentType,
  source,
  setSource,
  sortBy,
  setSortBy,
  onReset,
  totalMatches,
}) => {
  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Search Input Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6">
          <Input
            placeholder="Search keywords, role titles (e.g. React, Graduate, Data Analyst)..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="md:col-span-4">
          <Input
            placeholder="Location (e.g. Sydney, Remote)..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="md:col-span-2 flex items-center">
          <button
            onClick={onReset}
            className="w-full h-10 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Match Percentage Pill Filter */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Min Match:
          </span>
          {[0, 75, 85, 90].map((score) => (
            <button
              key={score}
              onClick={() => setMinMatchScore(score)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                minMatchScore === score
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {score === 0 ? 'Any' : `${score}%+`}
            </button>
          ))}
        </div>

        {/* Work Arrangement */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-semibold text-slate-500">Arrangement:</span>
          {ARRANGEMENTS.map((arr) => (
            <button
              key={arr}
              onClick={() => setWorkArrangement(arr)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                workArrangement === arr
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {arr}
            </button>
          ))}
        </div>

        {/* Source Platform Dropdown */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Source:</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as JobSource | 'All')}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Platforms' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'match' | 'date' | 'salary')}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="match">Match Score (Highest)</option>
            <option value="date">Date Posted (Newest)</option>
            <option value="salary">Salary (Highest)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
