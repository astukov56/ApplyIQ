'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Project } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Modal } from '@/components/ui';
import { Plus, Trash2, Edit, Code2, ExternalLink, GitBranch } from 'lucide-react';

export const ProjectsSection: React.FC = () => {
  const { profile, addProject, updateProject, deleteProject } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStackText, setTechStackText] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setTechStackText('');
    setGithubUrl('');
    setLiveUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingId(proj.id);
    setTitle(proj.title);
    setDescription(proj.description);
    setTechStackText(proj.techStack.join(', '));
    setGithubUrl(proj.githubUrl || '');
    setLiveUrl(proj.liveUrl || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const techStack = techStackText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingId) {
      updateProject(editingId, {
        title,
        description,
        techStack,
        githubUrl,
        liveUrl,
      });
    } else {
      addProject({
        title,
        description,
        techStack,
        githubUrl,
        liveUrl,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-sm">Key Engineering Projects</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showcase applications, systems, and repositories evaluated during AI match scoring
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAdd}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
        {profile.projects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No projects added yet.
          </div>
        ) : (
          profile.projects.map((proj) => (
            <div key={proj.id} className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    {proj.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(proj)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete project "${proj.title}"?`)) {
                        deleteProject(proj.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tech Stack Pills */}
              {proj.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proj.techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Project Links */}
              <div className="flex items-center gap-4 pt-1 text-xs">
                {proj.githubUrl && (
                  <a
                    href={proj.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Source Code</span>
                  </a>
                )}
                {proj.liveUrl && (
                  <a
                    href={proj.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Live Application</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Project' : 'Add Project'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Project Title *"
            placeholder="e.g. ApplyIQ - Job Search Intelligence"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="Project Description *"
            placeholder="Describe what the application does, architecture design, and problem solved."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Input
            label="Tech Stack (Comma-separated) *"
            placeholder="e.g. Next.js, TypeScript, Tailwind CSS, PostgreSQL"
            value={techStackText}
            onChange={(e) => setTechStackText(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="GitHub Repo URL"
              placeholder="https://github.com/..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
            <Input
              label="Live Website URL"
              placeholder="https://..."
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Project
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
