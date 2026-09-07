'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Education } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Modal } from '@/components/ui';
import { Plus, Trash2, Edit, GraduationCap, Calendar } from 'lucide-react';

export const EducationSection: React.FC = () => {
  const { profile, addEducation, updateEducation, deleteEducation } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [grade, setGrade] = useState('');
  const [details, setDetails] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setInstitution('');
    setDegree('');
    setFieldOfStudy('');
    setStartDate('');
    setEndDate('');
    setGrade('');
    setDetails('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (edu: Education) => {
    setEditingId(edu.id);
    setInstitution(edu.institution);
    setDegree(edu.degree);
    setFieldOfStudy(edu.fieldOfStudy);
    setStartDate(edu.startDate);
    setEndDate(edu.endDate);
    setGrade(edu.grade || '');
    setDetails(edu.details || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim() || !degree.trim()) return;

    if (editingId) {
      updateEducation(editingId, {
        institution,
        degree,
        fieldOfStudy,
        startDate,
        endDate,
        grade,
        details,
      });
    } else {
      addEducation({
        institution,
        degree,
        fieldOfStudy,
        startDate,
        endDate,
        grade,
        details,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-sm">Education & Qualifications</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Degrees, universities, distinctions, and academic achievements
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAdd}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Education
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
        {profile.education.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No education entries recorded yet.
          </div>
        ) : (
          profile.education.map((edu) => (
            <div key={edu.id} className="p-6 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    {edu.degree}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {edu.institution}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {edu.startDate} – {edu.endDate}
                    </span>
                    {edu.grade && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {edu.grade}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(edu)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove education entry for ${edu.institution}?`)) {
                        deleteEducation(edu.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {edu.details && (
                <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                  {edu.details}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>

      {/* Education Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Education' : 'Add Education'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Institution / University *"
              placeholder="e.g. University of Sydney"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
            />
            <Input
              label="Degree / Qualification *"
              placeholder="e.g. Bachelor of Science (Computer Science)"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Year"
              placeholder="e.g. 2022"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Graduation Year"
              placeholder="e.g. 2025"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Input
              label="Grade / Honors (Optional)"
              placeholder="e.g. Distinction (WAM 81.5)"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>

          <Textarea
            label="Key Coursework & Academic Highlights"
            placeholder="Relevant coursework: Data Structures, Database Systems, Web Development, Machine Learning."
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Education
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
