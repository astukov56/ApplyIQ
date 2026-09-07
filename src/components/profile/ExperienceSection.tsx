'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { WorkExperience } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Modal } from '@/components/ui';
import { Plus, Trash2, Edit, Building2, Calendar, MapPin, Briefcase } from 'lucide-react';

export const ExperienceSection: React.FC = () => {
  const { profile, addExperience, updateExperience, deleteExperience } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [highlightsText, setHighlightsText] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setCompany('');
    setRole('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setHighlightsText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: WorkExperience) => {
    setEditingId(exp.id);
    setCompany(exp.company);
    setRole(exp.role);
    setLocation(exp.location);
    setStartDate(exp.startDate);
    setEndDate(exp.endDate);
    setHighlightsText(exp.highlights.join('\n'));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    const highlights = highlightsText
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);

    if (editingId) {
      updateExperience(editingId, {
        company,
        role,
        location,
        startDate,
        endDate,
        highlights,
      });
    } else {
      addExperience({
        company,
        role,
        location,
        startDate,
        endDate,
        isCurrent: endDate.toLowerCase().includes('present'),
        highlights,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-sm">Work Experience</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Internships, full-time, and part-time software development roles
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAdd}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Experience
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
        {profile.experiences.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No work experience recorded yet.
          </div>
        ) : (
          profile.experiences.map((exp) => (
            <div key={exp.id} className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    {exp.role}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {exp.company}
                    </span>
                    {exp.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {exp.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {exp.startDate} – {exp.endDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(exp)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove experience at ${exp.company}?`)) {
                        deleteExperience(exp.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {exp.highlights.length > 0 && (
                <ul className="space-y-1.5 pt-1 pl-4 list-disc text-xs text-slate-600 dark:text-slate-300">
                  {exp.highlights.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>

      {/* Experience Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Work Experience' : 'Add Work Experience'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              placeholder="e.g. Canva"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
            <Input
              label="Job Role / Title *"
              placeholder="e.g. Software Engineer Intern"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Location"
              placeholder="e.g. Sydney, NSW"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input
              label="Start Date"
              placeholder="e.g. Nov 2024"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              placeholder="e.g. Present or Feb 2025"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Textarea
            label="Key Responsibilities & Achievements (One per line)"
            placeholder="Built responsive Next.js dashboards cutting cycle times by 40%&#10;Integrated REST API and Supabase queries&#10;Mentored junior team members"
            rows={4}
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
          />

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Experience
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
