'use client';

import React from 'react';
import type { ResumeVersion, MasterResume } from '@/types/resume';
import type { CandidateProfile, WorkExperience, Project, Education, SkillItem, SkillCategory } from '@/types/profile';
import type { StagedModification } from '@/types/tailor';
import {
  ResumeFormatSettings,
  DEFAULT_FORMAT_SETTINGS,
  FONT_FAMILY_STACKS,
  MARGIN_CONFIG,
  LINE_SPACING_CSS,
  DENSITY_CONFIG,
} from '@/types/resumeFormat';
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
import {
  renderInSituTextDiff,
  formatEducationDate,
} from '@/lib/diffUtils';
import { Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export interface ResumeContentData {
  id?: string;
  summary: string;
  skills: SkillItem[];
  experiences: WorkExperience[];
  education: Education[];
  projects: Project[];
}

export interface ResumeSheetProps {
  /** Resume version, master resume, or resume content data */
  data?: ResumeVersion | MasterResume | ResumeContentData;
  /** Alias for data */
  resume?: ResumeVersion;
  /** Alias for data */
  masterResume?: MasterResume;
  /** Candidate personal profile */
  profile: CandidateProfile;
  /** Formatting settings controlling typography, margins, density */
  formatting?: ResumeFormatSettings;
  /** Alias for formatting */
  formatSettings?: ResumeFormatSettings;
  /** Whether inline editing is enabled */
  editable?: boolean;
  /** Callback when resume content changes */
  onDataChange?: (updates: Partial<ResumeVersion & MasterResume>) => void;
  /** Callback when candidate profile contact info changes */
  onProfileChange?: (updates: Partial<CandidateProfile>) => void;
  /** Keywords to highlight in ATS analysis */
  highlightKeywords?: Set<string>;
  /** Whether keyword highlighting is visually enabled */
  enableHighlight?: boolean;
  /** Staged AI diff for review mode */
  stagedDiff?: StagedModification | null;
  /** Inner DOM element ref for height & page budget calculation */
  innerRef?: React.Ref<HTMLDivElement>;
  /** Optional DOM element ID */
  id?: string;
  /** Additional CSS class names */
  className?: string;
}

export function ResumeSheet({
  data,
  resume,
  masterResume,
  profile,
  formatting,
  formatSettings,
  editable = false,
  onDataChange,
  onProfileChange,
  highlightKeywords = new Set(),
  enableHighlight = true,
  stagedDiff = null,
  innerRef,
  id = 'resume-sheet-preview',
  className = '',
}: ResumeSheetProps) {
  // Resolve unified resume data source
  const rawData: ResumeContentData = data || resume || masterResume || {
    id: 'empty',
    summary: '',
    skills: [],
    experiences: [],
    education: [],
    projects: [],
  };

  // Staged AI Diff handling
  const isDiffMode = Boolean(stagedDiff && stagedDiff.proposedResume);
  const origResume = stagedDiff?.originalResume;
  const activeResume: ResumeContentData =
    isDiffMode && stagedDiff?.proposedResume ? stagedDiff.proposedResume : rawData;

  // Format settings resolution
  const format = formatting || formatSettings || DEFAULT_FORMAT_SETTINGS;
  const densityKey = format.density || 'balanced';
  const densityConfig = DENSITY_CONFIG[densityKey] || DENSITY_CONFIG.balanced;
  const marginConfig = MARGIN_CONFIG[format.margin] || MARGIN_CONFIG.normal;
  const fontStack = FONT_FAMILY_STACKS[format.fontFamily] || FONT_FAMILY_STACKS.Inter;
  const baseLineHeight = densityConfig.lineHeight || LINE_SPACING_CSS[format.lineSpacing] || 1.25;

  // Keywords set
  const kw = new Set([...highlightKeywords].map((k) => k.toLowerCase()));

  // Skill category grouping
  const skillGroups = (activeResume.skills || []).reduce<Record<string, string[]>>((acc, s) => {
    const cat = s.category || 'Core Technologies';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {});

  // Update handlers
  const handleProfileField = (field: keyof CandidateProfile, val: string) => {
    if (onProfileChange) {
      onProfileChange({ [field]: val });
    }
  };

  const handleSummaryChange = (val: string) => {
    if (onDataChange && !isDiffMode) {
      onDataChange({ summary: val });
    }
  };

  // Skills
  const handleUpdateCategorySkills = (categoryName: string, skillsStr: string) => {
    if (!onDataChange || isDiffMode) return;
    const newNames = skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const otherSkills = (activeResume.skills || []).filter(
      (s) => (s.category || 'Core Technologies') !== categoryName
    );

    const updatedCategorySkills: SkillItem[] = newNames.map((name) => ({
      id: crypto.randomUUID(),
      name,
      category: categoryName as SkillCategory,
      proficiency: 'Advanced',
    }));

    onDataChange({ skills: [...otherSkills, ...updatedCategorySkills] });
  };

  const handleAddSkillCategory = () => {
    if (!onDataChange || isDiffMode) return;
    const categoryName = prompt('Enter new skill category name (e.g. Cloud & DevOps, Databases):');
    if (!categoryName?.trim()) return;
    const newSkill: SkillItem = {
      id: crypto.randomUUID(),
      name: 'Example Skill',
      category: categoryName.trim() as SkillCategory,
      proficiency: 'Advanced',
    };
    onDataChange({ skills: [...(activeResume.skills || []), newSkill] });
  };

  // Experience
  const handleUpdateExp = (expIdx: number, field: keyof WorkExperience, val: any) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.experiences || [])];
    if (updated[expIdx]) {
      updated[expIdx] = { ...updated[expIdx], [field]: val };
      onDataChange({ experiences: updated });
    }
  };

  const handleUpdateExpBullet = (expIdx: number, bulletIdx: number, newText: string) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = [...(updated[expIdx].highlights || [])];
      highlights[bulletIdx] = newText;
      updated[expIdx] = {
        ...updated[expIdx],
        highlights,
      };
      onDataChange({ experiences: updated });
    }
  };

  const handleAddExpBullet = (expIdx: number, afterIdx?: number) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = [...(updated[expIdx].highlights || [])];
      const insertAt = afterIdx !== undefined ? afterIdx + 1 : highlights.length;
      highlights.splice(insertAt, 0, 'Spearheaded key engineering initiative resulting in 25% efficiency gain.');
      updated[expIdx] = {
        ...updated[expIdx],
        highlights,
      };
      onDataChange({ experiences: updated });
    }
  };

  const handleDeleteExpBullet = (expIdx: number, bulletIdx: number) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = (updated[expIdx].highlights || []).filter((_, i) => i !== bulletIdx);
      updated[expIdx] = {
        ...updated[expIdx],
        highlights,
      };
      onDataChange({ experiences: updated });
    }
  };

  const handleAddExperienceEntry = () => {
    if (!onDataChange || isDiffMode) return;
    const newExp: WorkExperience = {
      id: crypto.randomUUID(),
      role: 'Software Engineer',
      company: 'Tech Enterprise',
      location: 'San Francisco, CA',
      startDate: '2022',
      endDate: 'Present',
      isCurrent: true,
      highlights: [
        'Architected full-stack features using Next.js, TypeScript, and distributed databases.',
        'Optimized query performance and improved latency across critical microservices.',
      ],
    };
    onDataChange({ experiences: [newExp, ...(activeResume.experiences || [])] });
  };

  const handleDeleteExperienceEntry = (expIdx: number) => {
    if (!onDataChange || isDiffMode) return;
    if (!confirm('Are you sure you want to remove this experience entry?')) return;
    const updated = (activeResume.experiences || []).filter((_, i) => i !== expIdx);
    onDataChange({ experiences: updated });
  };

  // Projects
  const handleUpdateProject = (projIdx: number, field: keyof Project, val: any) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.projects || [])];
    if (updated[projIdx]) {
      updated[projIdx] = { ...updated[projIdx], [field]: val };
      onDataChange({ projects: updated });
    }
  };

  const handleUpdateProjectBullet = (projIdx: number, bulletIdx: number, newText: string) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.projects || [])];
    if (updated[projIdx]) {
      const bullets = [
        ...(updated[projIdx].highlights && updated[projIdx].highlights!.length > 0
          ? updated[projIdx].highlights!
          : updated[projIdx].description.split('\n').filter(Boolean)),
      ];
      bullets[bulletIdx] = newText;
      updated[projIdx] = {
        ...updated[projIdx],
        highlights: bullets,
        description: bullets.join('\n'),
      };
      onDataChange({ projects: updated });
    }
  };

  const handleAddProjectBullet = (projIdx: number, afterIdx?: number) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.projects || [])];
    if (updated[projIdx]) {
      const bullets = [
        ...(updated[projIdx].highlights && updated[projIdx].highlights!.length > 0
          ? updated[projIdx].highlights!
          : updated[projIdx].description.split('\n').filter(Boolean)),
      ];
      const insertAt = afterIdx !== undefined ? afterIdx + 1 : bullets.length;
      bullets.splice(insertAt, 0, 'Engineered core modules with 99.9% uptime and low-latency API response times.');
      updated[projIdx] = {
        ...updated[projIdx],
        highlights: bullets,
        description: bullets.join('\n'),
      };
      onDataChange({ projects: updated });
    }
  };

  const handleDeleteProjectBullet = (projIdx: number, bulletIdx: number) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.projects || [])];
    if (updated[projIdx]) {
      const bullets = [
        ...(updated[projIdx].highlights && updated[projIdx].highlights!.length > 0
          ? updated[projIdx].highlights!
          : updated[projIdx].description.split('\n').filter(Boolean)),
      ].filter((_, i) => i !== bulletIdx);
      updated[projIdx] = {
        ...updated[projIdx],
        highlights: bullets,
        description: bullets.join('\n'),
      };
      onDataChange({ projects: updated });
    }
  };

  const handleAddProjectEntry = () => {
    if (!onDataChange || isDiffMode) return;
    const newProj: Project = {
      id: crypto.randomUUID(),
      title: 'Real-Time Distributed Platform',
      description: 'Engineered an event-driven system with WebSocket feeds, processing 10k events/sec with sub-50ms p99 latency.\nIntegrated PostgreSQL connection pooling and Redis pub/sub layer, decreasing DB load by 40%.',
      highlights: [
        'Engineered an event-driven system with WebSocket feeds, processing 10k events/sec with sub-50ms p99 latency.',
        'Integrated PostgreSQL connection pooling and Redis pub/sub layer, decreasing DB load by 40%.',
      ],
      techStack: ['TypeScript', 'Next.js', 'PostgreSQL', 'Redis', 'Docker'],
      liveUrl: 'https://demo.example.com',
      githubUrl: 'https://github.com/example/project',
    };
    onDataChange({ projects: [newProj, ...(activeResume.projects || [])] });
  };

  const handleDeleteProjectEntry = (projIdx: number) => {
    if (!onDataChange || isDiffMode) return;
    if (!confirm('Are you sure you want to remove this project?')) return;
    const updated = (activeResume.projects || []).filter((_, i) => i !== projIdx);
    onDataChange({ projects: updated });
  };

  // Education
  const handleUpdateEducation = (eduIdx: number, field: keyof Education, val: any) => {
    if (!onDataChange || isDiffMode) return;
    const updated = [...(activeResume.education || [])];
    if (updated[eduIdx]) {
      updated[eduIdx] = { ...updated[eduIdx], [field]: val };
      onDataChange({ education: updated });
    }
  };

  const handleAddEducationEntry = () => {
    if (!onDataChange || isDiffMode) return;
    const newEdu: Education = {
      id: crypto.randomUUID(),
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science & Software Engineering',
      startDate: '2020',
      endDate: '2024',
      grade: 'Distinction Average (WAM 85)',
      details: 'Specialization in Distributed Systems, Algorithms, and Software Design.',
    };
    onDataChange({ education: [newEdu, ...(activeResume.education || [])] });
  };

  const handleDeleteEducationEntry = (eduIdx: number) => {
    if (!onDataChange || isDiffMode) return;
    if (!confirm('Are you sure you want to remove this education entry?')) return;
    const updated = (activeResume.education || []).filter((_, i) => i !== eduIdx);
    onDataChange({ education: updated });
  };

  // Section presence flags for non-editable mode
  const hasSummary = Boolean(activeResume.summary?.trim());
  const hasSkills = Object.keys(skillGroups).length > 0;
  const hasExperience = (activeResume.experiences || []).length > 0;
  const hasProjects = (activeResume.projects || []).length > 0;
  const hasEducation = (activeResume.education || []).length > 0;

  return (
    <div
      id={id}
      ref={innerRef}
      className={clsx(
        'resume-sheet bg-white text-gray-900 shadow-2xl mx-auto rounded-xs print:shadow-none print:m-0 print:mb-0 print:p-0 print:pb-0 print:border-none print:w-full print:max-w-full print:min-h-0 print:h-auto transition-all box-border relative select-text',
        className
      )}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: marginConfig.paddingPreview,
        fontFamily: fontStack,
        fontSize: `${format.fontSizePt}pt`,
        lineHeight: baseLineHeight,
        color: '#111827',
        boxSizing: 'border-box',
      }}
    >
      {/* Natural Top-Aligned Container: sections stack compactly from the top */}
      <div className="flex flex-col justify-start w-full">
        {/* Header: Candidate Name, Title, and Compact Contact Row */}
        <header className="text-center shrink-0 mb-1.5">
          <EditableField
            as="h1"
            value={profile.name}
            onChange={(val) => handleProfileField('name', val)}
            editable={editable && !isDiffMode}
            className="font-bold tracking-tight text-gray-900 print:text-black uppercase text-center block"
            style={{ fontSize: `${Math.round(format.fontSizePt * 1.8)}pt`, letterSpacing: '0.04em' }}
            placeholder="CANDIDATE NAME"
          />

          {profile.title && (
            <EditableField
              as="p"
              value={profile.title}
              onChange={(val) => handleProfileField('title', val)}
              editable={editable && !isDiffMode}
              className="font-semibold text-gray-700 print:text-black mt-0.5 tracking-wide text-center block"
              style={{ fontSize: `${format.fontSizePt}pt` }}
              placeholder="Professional Title (e.g. Senior Software Engineer)"
            />
          )}

          {/* Compact Contact Row: Phone | Email | LinkedIn | GitHub | Website | Location */}
          <div
            className="text-center mt-1 text-gray-600 print:text-black leading-snug flex flex-wrap justify-center items-center gap-x-1.5 gap-y-0.5"
            style={{ fontSize: `${Math.max(8.5, format.fontSizePt - 1.5)}pt` }}
          >
            {profile.phone && (
              <EditableField
                value={profile.phone}
                onChange={(val) => handleProfileField('phone', val)}
                editable={editable && !isDiffMode}
                placeholder="Phone Number"
              />
            )}

            {profile.phone && profile.email && (
              <span className="text-gray-400 print:text-black">|</span>
            )}

            {profile.email && (
              <EditableField
                value={profile.email}
                onChange={(val) => handleProfileField('email', val)}
                editable={editable && !isDiffMode}
                placeholder="email@example.com"
                className="underline text-gray-900 hover:text-indigo-600 print:text-black"
              />
            )}

            {(profile.phone || profile.email) && profile.linkedinUrl && (
              <span className="text-gray-400 print:text-black">|</span>
            )}

            {profile.linkedinUrl && (
              <a
                href={normalizeLinkedInUrl(profile.linkedinUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-gray-900 hover:text-indigo-600 print:text-black"
              >
                {formatLinkedInDisplay(profile.linkedinUrl)}
              </a>
            )}

            {(profile.phone || profile.email || profile.linkedinUrl) && profile.githubUrl && (
              <span className="text-gray-400 print:text-black">|</span>
            )}

            {profile.githubUrl && (
              <a
                href={normalizeGitHubUrl(profile.githubUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-gray-900 hover:text-indigo-600 print:text-black"
              >
                {formatGitHubDisplay(profile.githubUrl)}
              </a>
            )}

            {(profile.phone || profile.email || profile.linkedinUrl || profile.githubUrl) && profile.websiteUrl && (
              <span className="text-gray-400 print:text-black">|</span>
            )}

            {profile.websiteUrl && (
              <a
                href={normalizeUrl(profile.websiteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-gray-900 hover:text-indigo-600 print:text-black"
              >
                {formatDisplayUrl(profile.websiteUrl)}
              </a>
            )}

            {(profile.phone || profile.email || profile.linkedinUrl || profile.githubUrl || profile.websiteUrl) && profile.location && (
              <span className="text-gray-400 print:text-black">|</span>
            )}

            {profile.location && (
              <EditableField
                value={profile.location}
                onChange={(val) => handleProfileField('location', val)}
                editable={editable && !isDiffMode}
                placeholder="Location"
              />
            )}
          </div>
        </header>

        {/* Compact Sections Container: top-aligned with tight uniform spacing */}
        <div className="flex flex-col justify-start space-y-3.5 w-full">
          {/* Section 1: Professional Summary */}
          {(editable || hasSummary) && (
            <section className="w-full print:break-inside-avoid">
              <SectionHeader title="Professional Summary" />
              {isDiffMode && origResume && origResume.summary !== activeResume.summary ? (
                <div
                  className="text-justify text-gray-800 print:text-black block"
                  style={{ fontSize: `${format.fontSizePt}pt`, lineHeight: baseLineHeight }}
                >
                  {renderInSituTextDiff(origResume.summary, activeResume.summary)}
                </div>
              ) : (
                <EditableField
                  as="p"
                  value={activeResume.summary || ''}
                  onChange={handleSummaryChange}
                  editable={editable && !isDiffMode}
                  keywords={kw}
                  enableHighlight={enableHighlight}
                  className="text-justify text-gray-800 print:text-black block"
                  style={{ fontSize: `${format.fontSizePt}pt`, lineHeight: baseLineHeight }}
                  placeholder="Write a compelling professional summary highlighting your technical foundation and engineering impact..."
                />
              )}
            </section>
          )}

          {/* Section 2: Technical Skills */}
          {(editable || hasSkills) && (
            <section className="w-full print:break-inside-avoid">
              <SectionHeader
                title="Technical Skills"
                action={
                  editable && !isDiffMode ? (
                    <button
                      type="button"
                      onClick={handleAddSkillCategory}
                      className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Category</span>
                    </button>
                  ) : null
                }
              />
              {Object.keys(skillGroups).length === 0 ? (
                editable ? (
                  <div className="py-2 px-3 border border-dashed border-gray-300 rounded text-gray-400 text-xs italic flex items-center justify-between print:hidden">
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
                ) : null
              ) : (
                <div className="space-y-1 text-gray-800" style={{ fontSize: `${format.fontSizePt}pt`, lineHeight: baseLineHeight }}>
                  {Object.entries(skillGroups).map(([category, skills]) => (
                    <div key={category} className="flex items-baseline gap-x-2 group">
                      <span className="font-bold text-gray-900 print:text-black min-w-[140px] shrink-0">
                        {category}:
                      </span>
                      <EditableField
                        as="span"
                        value={skills.join(', ')}
                        onChange={(newSkillsStr) => handleUpdateCategorySkills(category, newSkillsStr)}
                        editable={editable && !isDiffMode}
                        keywords={kw}
                        enableHighlight={enableHighlight}
                        className="text-gray-800 print:text-black flex-1"
                        placeholder="Comma-separated skills (e.g. React, TypeScript, Next.js)"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Section 3: Work Experience */}
          {(editable || hasExperience) && (
            <section className="w-full print:break-inside-avoid">
              <SectionHeader
                title="Experience"
                action={
                  editable && !isDiffMode ? (
                    <button
                      type="button"
                      onClick={handleAddExperienceEntry}
                      className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Experience</span>
                    </button>
                  ) : null
                }
              />
              {(activeResume.experiences || []).length === 0 ? (
                editable ? (
                  <div className="py-2 px-3 border border-dashed border-gray-300 rounded text-gray-400 text-xs italic flex items-center justify-between print:hidden">
                    <span>No work experience entries yet. Add your past roles, internships, or contracts.</span>
                    <button
                      type="button"
                      onClick={handleAddExperienceEntry}
                      className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Experience</span>
                    </button>
                  </div>
                ) : null
              ) : (
                <div className="space-y-2">
                  {(activeResume.experiences || []).map((exp, expIdx) => {
                    const origExp = origResume?.experiences?.[expIdx];
                    const isNewExp = isDiffMode && !origExp;

                    return (
                      <div key={exp.id || expIdx} className="space-y-0.5 group relative">
                        {/* Line 1: Role (Left, Bold) | Dates (Right Flush) */}
                        <div className="flex justify-between items-baseline" style={{ fontSize: `${format.fontSizePt}pt` }}>
                          <div className="font-bold text-gray-900 print:text-black">
                            {isDiffMode && origExp && origExp.role !== exp.role ? (
                              renderInSituTextDiff(origExp.role, exp.role)
                            ) : (
                              <EditableField
                                value={exp.role}
                                onChange={(val) => handleUpdateExp(expIdx, 'role', val)}
                                editable={editable && !isDiffMode}
                                keywords={kw}
                                enableHighlight={enableHighlight}
                                className="font-bold text-gray-900 print:text-black"
                                placeholder="Role Title"
                              />
                            )}
                          </div>

                          <div className="text-right text-gray-600 print:text-black font-semibold shrink-0 flex items-center gap-1">
                            <EditableField
                              value={`${exp.startDate} – ${exp.endDate || 'Present'}`}
                              onChange={(val) => {
                                const parts = val.split(/[–-]/).map((s) => s.trim());
                                handleUpdateExp(expIdx, 'startDate', parts[0] || exp.startDate);
                                if (parts[1]) handleUpdateExp(expIdx, 'endDate', parts[1]);
                              }}
                              editable={editable && !isDiffMode}
                              className="text-gray-700 print:text-black font-semibold text-right"
                            />
                            {editable && !isDiffMode && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExperienceEntry(expIdx)}
                                title="Delete experience entry"
                                className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-rose-600 print:hidden cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Line 2: Company (Left, Italic/Semibold) | Location (Right Flush) */}
                        <div
                          className="flex justify-between items-baseline"
                          style={{ fontSize: `${Math.max(8.5, format.fontSizePt - 0.5)}pt` }}
                        >
                          <div className="font-medium italic text-gray-700 print:text-black">
                            {isDiffMode && origExp && origExp.company !== exp.company ? (
                              renderInSituTextDiff(origExp.company, exp.company)
                            ) : (
                              <EditableField
                                value={exp.company}
                                onChange={(val) => handleUpdateExp(expIdx, 'company', val)}
                                editable={editable && !isDiffMode}
                                className="font-medium italic text-gray-700 print:text-black"
                                placeholder="Company Name"
                              />
                            )}
                          </div>
                          <EditableField
                            value={exp.location || ''}
                            onChange={(val) => handleUpdateExp(expIdx, 'location', val)}
                            editable={editable && !isDiffMode}
                            className="text-gray-500 italic print:text-black text-right"
                            placeholder="City, State"
                          />
                        </div>

                        {/* Bullet points */}
                        <ul
                          className="list-disc pl-4 text-gray-800 print:text-black mt-0.5 space-y-0.5 leading-snug"
                          style={{ fontSize: `${format.fontSizePt}pt`, lineHeight: baseLineHeight }}
                        >
                          {(exp.highlights || []).map((highlight, hIdx) => {
                            const origHighlight = origExp?.highlights?.[hIdx];

                            if (isDiffMode && isNewExp) {
                              return (
                                <li key={hIdx} className="pl-0.5">
                                  <ins className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 no-underline font-medium rounded-xs px-0.5">
                                    {highlight}
                                  </ins>
                                </li>
                              );
                            }

                            if (isDiffMode && origHighlight && origHighlight !== highlight) {
                              return (
                                <li key={hIdx} className="pl-0.5">
                                  {renderInSituTextDiff(origHighlight, highlight)}
                                </li>
                              );
                            }

                            return (
                              <li key={hIdx} className="pl-0.5 group/bullet relative">
                                <EditableField
                                  value={highlight}
                                  onChange={(newText) => handleUpdateExpBullet(expIdx, hIdx, newText)}
                                  editable={editable && !isDiffMode}
                                  keywords={kw}
                                  enableHighlight={enableHighlight}
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
                                  placeholder="Action verb + quantified impact + technologies used..."
                                />
                                {editable && !isDiffMode && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpBullet(expIdx, hIdx)}
                                    title="Delete bullet"
                                    className="opacity-0 group-hover/bullet:opacity-100 ml-1.5 inline-flex items-center text-gray-400 hover:text-rose-600 print:hidden cursor-pointer align-middle"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {/* Hover Overlay: Add Bullet Button */}
                        {editable && !isDiffMode && (
                          <div className="relative h-0 w-full overflow-visible print:hidden">
                            <div className="absolute right-0 -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                              <button
                                type="button"
                                onClick={() => handleAddExpBullet(expIdx)}
                                className="text-[9px] font-semibold text-indigo-600 bg-white/95 border border-indigo-200 rounded px-1.5 py-0.5 shadow-xs hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Bullet</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Section 4: Projects */}
          {(editable || hasProjects) && (
            <section className="w-full print:break-inside-avoid">
              <SectionHeader
                title="Projects"
                action={
                  editable && !isDiffMode ? (
                    <button
                      type="button"
                      onClick={handleAddProjectEntry}
                      className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Project</span>
                    </button>
                  ) : null
                }
              />
              {(activeResume.projects || []).length === 0 ? (
                editable ? (
                  <div className="py-2 px-3 border border-dashed border-gray-300 rounded text-gray-400 text-xs italic flex items-center justify-between print:hidden">
                    <span>No projects added yet. Click &quot;Add Project&quot; to showcase your technical applications.</span>
                    <button
                      type="button"
                      onClick={handleAddProjectEntry}
                      className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Project</span>
                    </button>
                  </div>
                ) : null
              ) : (
                <div className="space-y-2">
                  {(activeResume.projects || []).map((proj, projIdx) => {
                    const projectBullets =
                      proj.highlights && proj.highlights.length > 0
                        ? proj.highlights
                        : proj.description.includes('\n')
                        ? proj.description.split('\n').filter(Boolean)
                        : [proj.description];

                    const origProj = origResume?.projects?.[projIdx];
                    const origBullets = origProj?.highlights || origProj?.description?.split('\n') || [];

                    return (
                      <div key={proj.id || projIdx} className="space-y-0.5 group relative">
                        <div className="flex justify-between items-baseline" style={{ fontSize: `${format.fontSizePt}pt` }}>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <EditableField
                              value={proj.title}
                              onChange={(val) => handleUpdateProject(projIdx, 'title', val)}
                              editable={editable && !isDiffMode}
                              keywords={kw}
                              enableHighlight={enableHighlight}
                              className="font-bold text-gray-900 print:text-black"
                              placeholder="Project Name"
                            />
                            <EditableField
                              value={proj.techStack ? proj.techStack.join(', ') : ''}
                              onChange={(val) => {
                                const stack = val.split(',').map((s) => s.trim()).filter(Boolean);
                                handleUpdateProject(projIdx, 'techStack', stack);
                              }}
                              editable={editable && !isDiffMode}
                              keywords={kw}
                              enableHighlight={enableHighlight}
                              className="text-[9pt] text-gray-500 print:text-black italic"
                              placeholder="TypeScript, React, Next.js"
                            />
                          </div>

                          <div className="text-right text-[9pt] text-gray-600 print:text-black shrink-0 flex items-center gap-2">
                            {proj.githubUrl && (
                              <a
                                href={proj.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-gray-900 hover:text-indigo-600 print:text-black"
                              >
                                Code
                              </a>
                            )}
                            {proj.liveUrl && (
                              <a
                                href={proj.liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-gray-900 hover:text-indigo-600 print:text-black"
                              >
                                Live Demo
                              </a>
                            )}
                            {editable && !isDiffMode && (
                              <button
                                type="button"
                                onClick={() => handleDeleteProjectEntry(projIdx)}
                                title="Delete project"
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 print:hidden cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Bullets */}
                        <ul
                          className="list-disc pl-4 text-gray-800 print:text-black mt-0.5 space-y-0.5 leading-snug"
                          style={{ fontSize: `${format.fontSizePt}pt`, lineHeight: baseLineHeight }}
                        >
                          {projectBullets.map((bullet, bIdx) => {
                            const origB = origBullets[bIdx];

                            if (isDiffMode && origB && origB !== bullet) {
                              return (
                                <li key={bIdx} className="pl-0.5">
                                  {renderInSituTextDiff(origB, bullet)}
                                </li>
                              );
                            }

                            return (
                              <li key={bIdx} className="pl-0.5 group/pbullet relative">
                                <EditableField
                                  value={bullet}
                                  onChange={(newText) => handleUpdateProjectBullet(projIdx, bIdx, newText)}
                                  editable={editable && !isDiffMode}
                                  keywords={kw}
                                  enableHighlight={enableHighlight}
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
                                  placeholder="Describe architecture, user scale, metrics achieved..."
                                />
                                {editable && !isDiffMode && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProjectBullet(projIdx, bIdx)}
                                    title="Delete bullet"
                                    className="opacity-0 group-hover/pbullet:opacity-100 ml-1.5 inline-flex items-center text-gray-400 hover:text-rose-600 print:hidden cursor-pointer align-middle"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {/* Hover Overlay: Add Bullet Button */}
                        {editable && !isDiffMode && (
                          <div className="relative h-0 w-full overflow-visible print:hidden">
                            <div className="absolute right-0 -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                              <button
                                type="button"
                                onClick={() => handleAddProjectBullet(projIdx)}
                                className="text-[9px] font-semibold text-indigo-600 bg-white/95 border border-indigo-200 rounded px-1.5 py-0.5 shadow-xs hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Bullet</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Section 5: Education */}
          {(editable || hasEducation) && (
            <section className="w-full print:break-inside-avoid">
              <SectionHeader
                title="Education"
                action={
                  editable && !isDiffMode ? (
                    <button
                      type="button"
                      onClick={handleAddEducationEntry}
                      className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Education</span>
                    </button>
                  ) : null
                }
              />
              {(activeResume.education || []).length === 0 ? (
                editable ? (
                  <div className="py-2 px-3 border border-dashed border-gray-300 rounded text-gray-400 text-xs italic flex items-center justify-between print:hidden">
                    <span>No education entries yet. Add your university degree, bootcamp, or credentials.</span>
                    <button
                      type="button"
                      onClick={handleAddEducationEntry}
                      className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Education</span>
                    </button>
                  </div>
                ) : null
              ) : (
                <div className="space-y-1.5">
                  {(activeResume.education || []).map((edu, eduIdx) => (
                    <div key={edu.id || eduIdx} className="space-y-0.5 group relative">
                      {/* Line 1: Degree & Field (Bold) | Graduation Date (Right Flush) */}
                      <div className="flex justify-between items-baseline" style={{ fontSize: `${format.fontSizePt}pt` }}>
                        <div className="flex items-baseline gap-1.5">
                          <EditableField
                            value={edu.degree}
                            onChange={(val) => handleUpdateEducation(eduIdx, 'degree', val)}
                            editable={editable && !isDiffMode}
                            keywords={kw}
                            enableHighlight={enableHighlight}
                            className="font-bold text-gray-900 print:text-black"
                            placeholder="Degree"
                          />
                          {edu.fieldOfStudy && (
                            <>
                              <span className="text-gray-400 print:text-black">in</span>
                              <EditableField
                                value={edu.fieldOfStudy}
                                onChange={(val) => handleUpdateEducation(eduIdx, 'fieldOfStudy', val)}
                                editable={editable && !isDiffMode}
                                keywords={kw}
                                enableHighlight={enableHighlight}
                                className="font-bold text-gray-900 print:text-black"
                                placeholder="Major / Field"
                              />
                            </>
                          )}
                        </div>

                        <div className="text-right text-gray-600 print:text-black font-semibold shrink-0 flex items-center gap-1">
                          <span>{formatEducationDate(edu.startDate, edu.endDate)}</span>
                          {editable && !isDiffMode && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEducationEntry(eduIdx)}
                              title="Delete education entry"
                              className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-rose-600 print:hidden cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Line 2: Institution (Italic) | Grade/GPA (Right Flush) */}
                      <div
                        className="flex justify-between items-baseline"
                        style={{ fontSize: `${Math.max(8.5, format.fontSizePt - 0.5)}pt` }}
                      >
                        <EditableField
                          value={edu.institution}
                          onChange={(val) => handleUpdateEducation(eduIdx, 'institution', val)}
                          editable={editable && !isDiffMode}
                          className="font-medium italic text-gray-700 print:text-black"
                          placeholder="University or Institution Name"
                        />

                        {edu.grade && (
                          <EditableField
                            value={edu.grade}
                            onChange={(val) => handleUpdateEducation(eduIdx, 'grade', val)}
                            editable={editable && !isDiffMode}
                            className="text-gray-500 italic print:text-black text-right"
                            placeholder="GPA or Distinction"
                          />
                        )}
                      </div>

                      {edu.details && (
                        <EditableField
                          as="p"
                          value={edu.details}
                          onChange={(val) => handleUpdateEducation(eduIdx, 'details', val)}
                          editable={editable && !isDiffMode}
                          className="text-gray-500 text-[9pt] italic"
                          placeholder="Relevant coursework or academic honors..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
