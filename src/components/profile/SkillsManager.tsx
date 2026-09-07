'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SkillCategory, SkillProficiency } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Modal, Badge } from '@/components/ui';
import { Plus, X, Wrench, Check } from 'lucide-react';

const CATEGORIES: SkillCategory[] = ['Languages', 'Frameworks', 'Cloud & DB', 'Tools & Other'];
const PROFICIENCIES: SkillProficiency[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export const SkillsManager: React.FC = () => {
  const { profile, addSkill, removeSkill } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('Languages');
  const [newSkillProficiency, setNewSkillProficiency] = useState<SkillProficiency>('Advanced');

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    addSkill({
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: newSkillProficiency,
    });

    setNewSkillName('');
    setIsModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-sm">Skills & Core Competencies</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matched against requirements during AI job analysis ({profile.skills.length} skills indexed)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Skill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {CATEGORIES.map((category) => {
          const categorySkills = profile.skills.filter((s) => s.category === category);
          if (categorySkills.length === 0) return null;

          return (
            <div key={category} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {category}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({categorySkills.length})
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {categorySkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 group"
                  >
                    <span>{skill.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      • {skill.proficiency}
                    </span>
                    <button
                      onClick={() => removeSkill(skill.id)}
                      className="opacity-40 group-hover:opacity-100 hover:text-rose-600 transition-opacity p-0.5 rounded"
                      title="Remove skill"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* Add Skill Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Candidate Skill"
        description="Add a language, framework, database, or tool to your candidate profile."
        maxWidth="md"
      >
        <form onSubmit={handleAddSkill} className="space-y-4">
          <Input
            label="Skill Name *"
            placeholder="e.g. Next.js, Docker, Python, Tailwind CSS"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={newSkillCategory}
            onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
          />

          <Select
            label="Proficiency Level"
            options={PROFICIENCIES.map((p) => ({ value: p, label: p }))}
            value={newSkillProficiency}
            onChange={(e) => setNewSkillProficiency(e.target.value as SkillProficiency)}
          />

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add to Profile
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
