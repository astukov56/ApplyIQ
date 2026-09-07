'use client';

import React from 'react';
import type { MasterResume } from '@/types/resume';
import type { CandidateProfile, WorkExperience, Project, Education, SkillItem, SkillCategory } from '@/types/profile';
import {
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
  normalizeUrl,
  formatDisplayUrl,
} from '@/lib/linkUtils';
import {
  EditableField,
  SectionHeader,
} from '@/components/resume/EditableResumePrimitives';
import { formatEducationDate } from '@/lib/diffUtils';
import {
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';

export interface MasterResumePreviewProps {
  masterResume: MasterResume;
  profile: CandidateProfile;
  onChange: (updates: Partial<MasterResume> & Partial<CandidateProfile>) => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
}

export function MasterResumePreview({
  masterResume,
  profile,
  onChange,
  isSaving = false,
}: MasterResumePreviewProps) {
  // Group skills by category
  const skillGroups = (masterResume.skills || []).reduce<Record<string, string[]>>((acc, s) => {
    const cat = s.category || 'Core Technologies';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {});

  // --- Handlers for Profile Contact info ---
  const handleProfileField = (field: keyof CandidateProfile, val: string) => {
    onChange({ [field]: val });
  };

  // --- Handlers for Summary ---
  const handleSummaryChange = (val: string) => {
    onChange({ summary: val });
  };

  // --- Handlers for Skills ---
  const handleUpdateCategorySkills = (categoryName: string, skillsStr: string) => {
    const newNames = skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const otherSkills = (masterResume.skills || []).filter(
      (s) => (s.category || 'Core Technologies') !== categoryName
    );

    const updatedCategorySkills: SkillItem[] = newNames.map((name) => ({
      id: crypto.randomUUID(),
      name,
      category: categoryName as SkillCategory,
      proficiency: 'Advanced',
    }));

    const combinedSkills = [...otherSkills, ...updatedCategorySkills];
    onChange({ skills: combinedSkills });
  };

  const handleAddSkillCategory = () => {
    const categoryName = prompt('Enter new skill category name (e.g. Cloud & DevOps, Databases):');
    if (!categoryName?.trim()) return;
    const newSkill: SkillItem = {
      id: crypto.randomUUID(),
      name: 'Example Skill',
      category: categoryName.trim() as SkillCategory,
      proficiency: 'Advanced',
    };
    onChange({ skills: [...(masterResume.skills || []), newSkill] });
  };

  // --- Handlers for Experience ---
  const handleUpdateExp = (expIdx: number, field: keyof WorkExperience, val: any) => {
    const updated = [...(masterResume.experiences || [])];
    if (updated[expIdx]) {
      updated[expIdx] = { ...updated[expIdx], [field]: val };
      onChange({ experiences: updated });
    }
  };

  const handleUpdateExpBullet = (expIdx: number, bulletIdx: number, text: string) => {
    const updated = [...(masterResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = [...(updated[expIdx].highlights || [])];
      highlights[bulletIdx] = text;
      updated[expIdx] = { ...updated[expIdx], highlights };
      onChange({ experiences: updated });
    }
  };

  const handleAddExpBullet = (expIdx: number, insertAfterIndex?: number) => {
    const updated = [...(masterResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = [...(updated[expIdx].highlights || [])];
      const newBullet = 'Spearheaded engineering deliverables with automated tests and CI/CD pipelines.';
      if (insertAfterIndex !== undefined) {
        highlights.splice(insertAfterIndex + 1, 0, newBullet);
      } else {
        highlights.push(newBullet);
      }
      updated[expIdx] = { ...updated[expIdx], highlights };
      onChange({ experiences: updated });
    }
  };

  const handleDeleteExpBullet = (expIdx: number, bulletIdx: number) => {
    const updated = [...(masterResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = (updated[expIdx].highlights || []).filter((_, i) => i !== bulletIdx);
      updated[expIdx] = { ...updated[expIdx], highlights };
      onChange({ experiences: updated });
    }
  };

  const handleAddExperienceEntry = () => {
    const newEntry: WorkExperience = {
      id: crypto.randomUUID(),
      role: 'Senior Software Engineer',
      company: 'Tech Company',
      location: 'Sydney, NSW',
      startDate: '2023',
      endDate: 'Present',
      isCurrent: true,
      highlights: [
        'Architected and delivered event-driven distributed microservices using Next.js and TypeScript.',
        'Optimized database indexing and caching, improving p99 query latency by 45%.',
      ],
    };
    onChange({ experiences: [newEntry, ...(masterResume.experiences || [])] });
  };

  const handleDeleteExperienceEntry = (expIdx: number) => {
    if (!confirm('Are you sure you want to remove this experience entry?')) return;
    const updated = (masterResume.experiences || []).filter((_, i) => i !== expIdx);
    onChange({ experiences: updated });
  };

  // --- Handlers for Projects (Multi-Bullet STAR Support) ---
  const handleUpdateProject = (projIdx: number, field: keyof Project, val: any) => {
    const updated = [...(masterResume.projects || [])];
    if (updated[projIdx]) {
      updated[projIdx] = { ...updated[projIdx], [field]: val };
      onChange({ projects: updated });
    }
  };

  const handleUpdateProjectBullet = (projIdx: number, bulletIdx: number, text: string) => {
    const updated = [...(masterResume.projects || [])];
    if (updated[projIdx]) {
      const currentHighlights = updated[projIdx].highlights || [updated[projIdx].description];
      const highlights = [...currentHighlights];
      highlights[bulletIdx] = text;
      updated[projIdx] = { ...updated[projIdx], highlights, description: highlights.join(' ') };
      onChange({ projects: updated });
    }
  };

  const handleAddProjectBullet = (projIdx: number, insertAfterIdx?: number) => {
    const updated = [...(masterResume.projects || [])];
    if (updated[projIdx]) {
      const currentHighlights = updated[projIdx].highlights || [updated[projIdx].description];
      const highlights = [...currentHighlights];
      const newBullet = 'Engineered high-throughput architecture, increasing operational reliability by 35%.';
      if (insertAfterIdx !== undefined) {
        highlights.splice(insertAfterIdx + 1, 0, newBullet);
      } else {
        highlights.push(newBullet);
      }
      updated[projIdx] = { ...updated[projIdx], highlights, description: highlights.join(' ') };
      onChange({ projects: updated });
    }
  };

  const handleDeleteProjectBullet = (projIdx: number, bulletIdx: number) => {
    const updated = [...(masterResume.projects || [])];
    if (updated[projIdx]) {
      const currentHighlights = updated[projIdx].highlights || [updated[projIdx].description];
      const highlights = currentHighlights.filter((_, i) => i !== bulletIdx);
      updated[projIdx] = { ...updated[projIdx], highlights, description: highlights.join(' ') };
      onChange({ projects: updated });
    }
  };

  const handleAddProjectEntry = () => {
    const newProj: Project = {
      id: crypto.randomUUID(),
      title: 'Cloud-Native Telemetry Pipeline',
      description: 'Engineered high-throughput event processing platform using Next.js, TypeScript, and PostgreSQL.',
      techStack: ['TypeScript', 'Next.js', 'PostgreSQL', 'Tailwind CSS'],
      highlights: [
        'Architected real-time streaming telemetry pipeline processing 20k events/sec with zero packet loss.',
        'Designed idempotent data synchronisation routines, eliminating write contention across distributed nodes.',
      ],
    };
    onChange({ projects: [newProj, ...(masterResume.projects || [])] });
  };

  const handleDeleteProjectEntry = (projIdx: number) => {
    if (!confirm('Are you sure you want to remove this project?')) return;
    const updated = (masterResume.projects || []).filter((_, i) => i !== projIdx);
    onChange({ projects: updated });
  };

  // --- Handlers for Education ---
  const handleUpdateEducation = (eduIdx: number, field: keyof Education, val: any) => {
    const updated = [...(masterResume.education || [])];
    if (updated[eduIdx]) {
      updated[eduIdx] = { ...updated[eduIdx], [field]: val };
      onChange({ education: updated });
    }
  };

  const handleAddEducationEntry = () => {
    const newEdu: Education = {
      id: crypto.randomUUID(),
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      institution: 'University of Technology Sydney',
      startDate: '2021',
      endDate: '2024',
      grade: 'Distinction Average (WAM 84)',
      details: 'Specialization in Distributed Systems, Algorithms, and Software Design.',
    };
    onChange({ education: [newEdu, ...(masterResume.education || [])] });
  };

  const handleDeleteEducationEntry = (eduIdx: number) => {
    if (!confirm('Are you sure you want to remove this education entry?')) return;
    const updated = (masterResume.education || []).filter((_, i) => i !== eduIdx);
    onChange({ education: updated });
  };

  return (
    <div className="space-y-2">
      {/* Top Status & Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs print:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Master Resume (Live Editable)</span>
          </span>

          {/* Real-time Debounced Persistence Badge */}
          {isSaving ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
              <span>Saving changes…</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Saved to Supabase &amp; Library</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            Click any field to edit · Enter/Backspace for bullets
          </span>
        </div>
      </div>

      {/* A4 Paper Sheet Container — Harvard/Ivy League Standard ATS Format */}
      <div
        id="master-resume-preview"
        className="bg-white text-slate-900 shadow-2xl mx-auto rounded-xs print:shadow-none print:m-0"
        style={{
          width: '816px',
          minHeight: '1056px',
          padding: '38px 48px', // Calibrated padding for single-page budget
          fontFamily: '"Times New Roman", Times, "Cambria", Georgia, serif',
          fontSize: '10.5px',
          lineHeight: 1.28, // Tight, calibrated line height
          color: '#0f172a',
          boxSizing: 'border-box',
        }}
      >
        {/* Header: Candidate Name, Title, and Contact Line */}
        <div className="text-center mb-2">
          <EditableField
            as="h1"
            value={profile.name}
            onChange={(val) => handleProfileField('name', val)}
            className="font-bold tracking-tight text-slate-950 print:text-black uppercase text-center block"
            style={{ fontSize: '23px', letterSpacing: '0.04em' }}
            placeholder="CANDIDATE NAME"
          />

          <EditableField
            as="p"
            value={profile.title}
            onChange={(val) => handleProfileField('title', val)}
            className="text-[11px] font-semibold text-slate-700 print:text-black mt-0.5 tracking-wide text-center block"
            placeholder="Professional Title (e.g. Senior Software Engineer)"
          />

          {/* Contact details with pipe separators and editable URLs */}
          <div className="text-center mt-1 text-[9.5px] text-slate-600 print:text-black leading-snug flex flex-wrap justify-center items-center gap-x-1.5 gap-y-0.5">
            <EditableField
              value={profile.phone || ''}
              onChange={(val) => handleProfileField('phone', val)}
              placeholder="Phone Number"
            />
            <span className="text-slate-400 print:text-black">|</span>
            <EditableField
              value={profile.email || ''}
              onChange={(val) => handleProfileField('email', val)}
              placeholder="email@example.com"
              className="text-blue-700 print:text-black"
            />
            <span className="text-slate-400 print:text-black">|</span>
            <EditableField
              value={profile.location || ''}
              onChange={(val) => handleProfileField('location', val)}
              placeholder="City, State"
            />
            {(profile.linkedinUrl || profile.githubUrl || profile.websiteUrl) && (
              <>
                <span className="text-slate-400 print:text-black">|</span>
                {profile.linkedinUrl && (
                  <a
                    href={normalizeLinkedInUrl(profile.linkedinUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 print:text-black hover:underline"
                  >
                    {formatLinkedInDisplay(profile.linkedinUrl)}
                  </a>
                )}
                {profile.linkedinUrl && profile.githubUrl && (
                  <span className="text-slate-400 print:text-black">|</span>
                )}
                {profile.githubUrl && (
                  <a
                    href={normalizeGitHubUrl(profile.githubUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 print:text-black hover:underline"
                  >
                    {formatGitHubDisplay(profile.githubUrl)}
                  </a>
                )}
                {(profile.linkedinUrl || profile.githubUrl) && profile.websiteUrl && (
                  <span className="text-slate-400 print:text-black">|</span>
                )}
                {profile.websiteUrl && (
                  <a
                    href={normalizeUrl(profile.websiteUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 print:text-black hover:underline"
                  >
                    {formatDisplayUrl(profile.websiteUrl)}
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Section 1: Professional Summary */}
        <div className="mb-2">
          <SectionHeader title="Professional Summary" />
          <EditableField
            as="p"
            value={masterResume.summary || ''}
            onChange={handleSummaryChange}
            className="text-[10px] leading-[1.32] text-justify text-slate-800 print:text-black block"
            placeholder="Write a compelling professional summary highlighting your engineering foundation..."
          />
        </div>

        {/* Section 2: Technical Skills */}
        <div className="mb-2">
          <SectionHeader
            title="Technical Skills"
            action={
              <button
                type="button"
                onClick={handleAddSkillCategory}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Category</span>
              </button>
            }
          />
          {Object.keys(skillGroups).length === 0 ? (
            <div className="py-2 px-3 border border-dashed border-slate-300 rounded text-slate-400 text-[10px] italic flex items-center justify-between print:hidden">
              <span>No technical skills listed yet. Click &quot;Add Category&quot; to list your core technologies.</span>
              <button
                type="button"
                onClick={handleAddSkillCategory}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Skill</span>
              </button>
            </div>
          ) : (
            <div className="space-y-0.5 text-[10px] leading-[1.32]">
              {Object.entries(skillGroups).map(([category, skills]) => (
                <div key={category} className="flex items-baseline group">
                  <span className="font-bold text-slate-950 print:text-black min-w-[125px] shrink-0">
                    {category}:
                  </span>
                  <EditableField
                    as="span"
                    value={skills.join(', ')}
                    onChange={(newSkillsStr) => handleUpdateCategorySkills(category, newSkillsStr)}
                    className="text-slate-800 print:text-black flex-1"
                    placeholder="Comma-separated skills (e.g. React, TypeScript, Next.js)"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Work Experience */}
        <div className="mb-2">
          <SectionHeader
            title="Professional Experience"
            action={
              <button
                type="button"
                onClick={handleAddExperienceEntry}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Experience</span>
              </button>
            }
          />
          {(masterResume.experiences || []).length === 0 ? (
            <div className="py-2 px-3 border border-dashed border-slate-300 rounded text-slate-400 text-[10px] italic flex items-center justify-between print:hidden">
              <span>No work experience entries yet. Add your past jobs, internships, or engineering roles.</span>
              <button
                type="button"
                onClick={handleAddExperienceEntry}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Experience</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
            {(masterResume.experiences || []).map((exp, expIdx) => (
              <div key={exp.id || expIdx} className="space-y-0.5 group relative">
                {/* Header: Role & Company (Left) | Dates & Location (Right) */}
                <div className="flex justify-between items-baseline text-[10.5px]">
                  <div className="flex items-baseline gap-1.5">
                    <EditableField
                      value={exp.role}
                      onChange={(val) => handleUpdateExp(expIdx, 'role', val)}
                      className="font-bold text-slate-950 print:text-black"
                      placeholder="Job Title"
                    />
                    <span className="text-slate-400 print:text-black">&mdash;</span>
                    <EditableField
                      value={exp.company}
                      onChange={(val) => handleUpdateExp(expIdx, 'company', val)}
                      className="font-semibold text-slate-800 print:text-black"
                      placeholder="Company Name"
                    />
                  </div>

                  <div className="text-right text-[9.5px] font-medium text-slate-600 print:text-black shrink-0 flex items-center gap-1">
                    <EditableField
                      value={`${exp.startDate} – ${exp.endDate || 'Present'}`}
                      onChange={(val) => {
                        const parts = val.split(/[–-]/).map((s) => s.trim());
                        handleUpdateExp(expIdx, 'startDate', parts[0] || exp.startDate);
                        if (parts[1]) handleUpdateExp(expIdx, 'endDate', parts[1]);
                      }}
                      className="text-slate-600 print:text-black"
                    />
                    {exp.location && (
                      <>
                        <span className="text-slate-400 print:text-black">|</span>
                        <EditableField
                          value={exp.location}
                          onChange={(val) => handleUpdateExp(expIdx, 'location', val)}
                          className="text-slate-600 print:text-black"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteExperienceEntry(expIdx)}
                      title="Delete experience entry"
                      className="opacity-0 group-hover:opacity-100 ml-1 text-slate-400 hover:text-rose-600 print:hidden cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Bullets with Enter/Backspace keyboard navigation */}
                <ul className="list-disc pl-4 space-y-0.5 text-[10px] leading-[1.28] text-slate-800 print:text-black">
                  {(exp.highlights || []).map((highlight, hIdx) => (
                    <li key={hIdx} className="pl-0.5 group/bullet relative">
                      <EditableField
                        value={highlight}
                        onChange={(newText) => handleUpdateExpBullet(expIdx, hIdx, newText)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddExpBullet(expIdx, hIdx);
                          } else if (e.key === 'Backspace' && !highlight.trim()) {
                            e.preventDefault();
                            handleDeleteExpBullet(expIdx, hIdx);
                          }
                        }}
                        className="inline"
                        placeholder="Action verb + achievement + quantified metrics..."
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteExpBullet(expIdx, hIdx)}
                        title="Delete bullet"
                        className="opacity-0 group-hover/bullet:opacity-100 ml-1.5 inline-flex items-center text-slate-400 hover:text-rose-600 print:hidden cursor-pointer align-middle"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Zero-Height Hover Overlay: Add Bullet Button (Consumes 0px in document flow) */}
                <div className="relative h-0 w-full overflow-visible print:hidden">
                  <div className="absolute right-0 -top-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={() => handleAddExpBullet(expIdx)}
                      className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-white/95 dark:bg-slate-900/95 border border-indigo-200 dark:border-indigo-800 rounded px-1.5 py-0.5 shadow-xs hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Bullet</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Section 4: Projects (With Multi-Bullet STAR Support) */}
        <div className="mb-2">
          <SectionHeader
            title="Key Engineering Projects"
            action={
              <button
                type="button"
                onClick={handleAddProjectEntry}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Project</span>
              </button>
            }
          />
          {(masterResume.projects || []).length === 0 ? (
            <div className="py-2 px-3 border border-dashed border-slate-300 rounded text-slate-400 text-[10px] italic flex items-center justify-between print:hidden">
              <span>No engineering projects added yet. Click &quot;Add Project&quot; to showcase your technical applications or open-source work.</span>
              <button
                type="button"
                onClick={handleAddProjectEntry}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Project</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {(masterResume.projects || []).map((proj, projIdx) => {
                const projectBullets =
                  proj.highlights && proj.highlights.length > 0
                    ? proj.highlights
                    : proj.description.includes('\n')
                    ? proj.description.split('\n').filter(Boolean)
                    : [proj.description];

                return (
                  <div key={proj.id || projIdx} className="space-y-0.5 group relative">
                    <div className="flex justify-between items-baseline text-[10.5px]">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <EditableField
                          value={proj.title}
                          onChange={(val) => handleUpdateProject(projIdx, 'title', val)}
                          className="font-bold text-slate-950 print:text-black"
                          placeholder="Project Name"
                        />
                        <EditableField
                          value={proj.techStack ? proj.techStack.join(', ') : ''}
                          onChange={(val) => {
                            const stack = val.split(',').map((s) => s.trim()).filter(Boolean);
                            handleUpdateProject(projIdx, 'techStack', stack);
                          }}
                          className="text-[9.5px] text-slate-600 print:text-black italic"
                          placeholder="TypeScript, React, Next.js"
                        />
                      </div>

                      <div className="text-right text-[9.5px] text-slate-500 print:text-black shrink-0 flex items-center gap-2">
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 print:text-black hover:underline"
                          >
                            GitHub ↗
                          </a>
                        )}
                        {proj.liveUrl && (
                          <a
                            href={proj.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 print:text-black hover:underline"
                          >
                            Live Demo ↗
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteProjectEntry(projIdx)}
                          title="Delete project"
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 print:hidden cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Multi-Bullet STAR details */}
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] leading-[1.28] text-slate-800 print:text-black">
                      {projectBullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="pl-0.5 group/pbullet relative">
                          <EditableField
                            value={bullet}
                            onChange={(newText) => handleUpdateProjectBullet(projIdx, bIdx, newText)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddProjectBullet(projIdx, bIdx);
                              } else if (e.key === 'Backspace' && !bullet.trim()) {
                                e.preventDefault();
                                handleDeleteProjectBullet(projIdx, bIdx);
                              }
                            }}
                            className="inline"
                            placeholder="STAR achievement + technical impact + metric..."
                          />
                          {projectBullets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProjectBullet(projIdx, bIdx)}
                              title="Delete bullet"
                              className="opacity-0 group-hover/pbullet:opacity-100 ml-1.5 inline-flex items-center text-slate-400 hover:text-rose-600 print:hidden cursor-pointer align-middle"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Zero-Height Hover Overlay: Add Project STAR Bullet Button */}
                    <div className="relative h-0 w-full overflow-visible print:hidden">
                      <div className="absolute right-0 -top-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                        <button
                          type="button"
                          onClick={() => handleAddProjectBullet(projIdx)}
                          className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-white/95 dark:bg-slate-900/95 border border-indigo-200 dark:border-indigo-800 rounded px-1.5 py-0.5 shadow-xs hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Add STAR Bullet</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 5: Education */}
        <div className="mb-2">
          <SectionHeader
            title="Education"
            action={
              <button
                type="button"
                onClick={handleAddEducationEntry}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Education</span>
              </button>
            }
          />
          {(masterResume.education || []).length === 0 ? (
            <div className="py-2 px-3 border border-dashed border-slate-300 rounded text-slate-400 text-[10px] italic flex items-center justify-between print:hidden">
              <span>No education entries added yet. Click &quot;Add Education&quot; to list your degree or qualifications.</span>
              <button
                type="button"
                onClick={handleAddEducationEntry}
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add Education</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
            {(masterResume.education || []).map((edu, eduIdx) => (
              <div key={edu.id || eduIdx} className="space-y-0.5 group">
                <div className="flex justify-between items-baseline text-[10.5px]">
                  <div className="flex items-baseline gap-1.5">
                    <EditableField
                      value={edu.degree}
                      onChange={(val) => handleUpdateEducation(eduIdx, 'degree', val)}
                      className="font-bold text-slate-950 print:text-black"
                      placeholder="Degree"
                    />
                    <span className="text-slate-400 print:text-black">in</span>
                    <EditableField
                      value={edu.fieldOfStudy || ''}
                      onChange={(val) => handleUpdateEducation(eduIdx, 'fieldOfStudy', val)}
                      className="font-semibold text-slate-800 print:text-black"
                      placeholder="Field of Study"
                    />
                    <EditableField
                      value={edu.grade || ''}
                      onChange={(val) => handleUpdateEducation(eduIdx, 'grade', val)}
                      className="text-[9.5px] text-slate-600 print:text-black"
                      placeholder="GPA / Grade"
                    />
                  </div>

                  <div className="text-right text-[9.5px] font-medium text-slate-600 print:text-black shrink-0 flex items-center gap-1.5">
                    <EditableField
                      value={formatEducationDate(edu.startDate, edu.endDate)}
                      onChange={(val) => {
                        const parts = val.split(/[–-]/).map((s) => s.trim());
                        handleUpdateEducation(eduIdx, 'startDate', parts[0] || edu.startDate);
                        if (parts[1]) handleUpdateEducation(eduIdx, 'endDate', parts[1]);
                      }}
                      className="text-slate-600 print:text-black"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteEducationEntry(eduIdx)}
                      title="Delete education entry"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 print:hidden cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 text-[10px] text-slate-700 print:text-black font-semibold">
                  <span>at</span>
                  <EditableField
                    value={edu.institution}
                    onChange={(val) => handleUpdateEducation(eduIdx, 'institution', val)}
                    className="text-[10px] text-slate-700 print:text-black font-semibold flex-1"
                    placeholder="Institution / University Name"
                  />
                </div>

                <EditableField
                  as="p"
                  value={edu.details || ''}
                  onChange={(val) => handleUpdateEducation(eduIdx, 'details', val)}
                  className="text-[9.5px] text-slate-600 print:text-black italic mt-0.5 block"
                  placeholder="Honours, relevant coursework, or academic achievements..."
                />
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Embedded print stylesheet rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          #master-resume-preview {
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          [contenteditable] {
            outline: none !important;
            border: none !important;
            background: transparent !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
