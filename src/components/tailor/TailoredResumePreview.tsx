'use client';

import React, { useState } from 'react';
import type { ResumeVersion } from '@/types/resume';
import type { CandidateProfile } from '@/types/profile';
import type { SkillItem, SkillCategory } from '@/types/profile';
import type { StagedModification } from '@/types/tailor';
import {
  normalizeLinkedInUrl,
  formatLinkedInDisplay,
  normalizeGitHubUrl,
  formatGitHubDisplay,
  normalizeUrl,
  formatDisplayUrl,
} from '@/lib/linkUtils';
import {
  Sparkles,
  Eye,
  EyeOff,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';
import {
  EditableField,
  SectionHeader,
} from '@/components/resume/EditableResumePrimitives';
import {
  renderInSituTextDiff,
  formatEducationDate,
} from '@/lib/diffUtils';

export interface TailoredResumePreviewProps {
  resume: ResumeVersion;
  profile: CandidateProfile;
  /** Set of matched keywords to highlight */
  highlightKeywords?: Set<string>;
  /** Optional interactive controls toolbar */
  showControls?: boolean;
  /** Whether inline live-editing is enabled */
  editable?: boolean;
  /** Callback fired whenever resume content is modified inline */
  onChange?: (updatedResume: ResumeVersion) => void;
  /** Active staged modification awaiting review */
  stagedDiff?: StagedModification | null;
  /** Accept staged modification callback */
  onAcceptStaged?: () => void;
  /** Reject staged modification callback */
  onRejectStaged?: () => void;
}

export function TailoredResumePreview({
  resume,
  profile,
  highlightKeywords = new Set(),
  showControls = false,
  editable = true,
  onChange,
  stagedDiff = null,
  onAcceptStaged,
  onRejectStaged,
}: TailoredResumePreviewProps) {
  const [enableHighlight, setEnableHighlight] = useState(true);
  const kw = new Set([...highlightKeywords].map((k) => k.toLowerCase()));

  const isDiffMode = Boolean(stagedDiff && stagedDiff.proposedResume);
  const origResume = stagedDiff?.originalResume;
  const activeResume: ResumeVersion =
    isDiffMode && stagedDiff?.proposedResume ? stagedDiff.proposedResume : resume;

  const emitChange = (updated: Partial<ResumeVersion>) => {
    if (onChange && !isDiffMode) {
      onChange({
        ...activeResume,
        ...updated,
        id: activeResume.id,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // --- Handlers for Experience edits ---
  const handleUpdateExp = (index: number, field: string, val: any) => {
    const updated = [...(activeResume.experiences || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: val };
      emitChange({ experiences: updated });
    }
  };

  const handleUpdateExpBullet = (expIdx: number, bulletIdx: number, text: string) => {
    const updated = [...(activeResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = [...(updated[expIdx].highlights || [])];
      highlights[bulletIdx] = text;
      updated[expIdx] = { ...updated[expIdx], highlights };
      emitChange({ experiences: updated });
    }
  };

  const handleAddExpBullet = (expIdx: number, insertAfterIdx?: number) => {
    const updated = [...(activeResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = [...(updated[expIdx].highlights || [])];
      const newBullet = 'Spearheaded technical initiatives driving measurable delivery improvements.';
      if (insertAfterIdx !== undefined) {
        highlights.splice(insertAfterIdx + 1, 0, newBullet);
      } else {
        highlights.push(newBullet);
      }
      updated[expIdx] = { ...updated[expIdx], highlights };
      emitChange({ experiences: updated });
    }
  };

  const handleDeleteExpBullet = (expIdx: number, bulletIdx: number) => {
    const updated = [...(activeResume.experiences || [])];
    if (updated[expIdx]) {
      const highlights = (updated[expIdx].highlights || []).filter((_, i) => i !== bulletIdx);
      updated[expIdx] = { ...updated[expIdx], highlights };
      emitChange({ experiences: updated });
    }
  };

  // --- Handlers for Project edits (STAR bullets support) ---
  const handleUpdateProject = (index: number, field: string, val: any) => {
    const updated = [...(activeResume.projects || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: val };
      emitChange({ projects: updated });
    }
  };

  const handleUpdateProjectBullet = (projIdx: number, bulletIdx: number, text: string) => {
    const updated = [...(activeResume.projects || [])];
    if (updated[projIdx]) {
      const currentHighlights = updated[projIdx].highlights || [updated[projIdx].description];
      const highlights = [...currentHighlights];
      highlights[bulletIdx] = text;
      updated[projIdx] = { ...updated[projIdx], highlights, description: highlights.join(' ') };
      emitChange({ projects: updated });
    }
  };

  const handleAddProjectBullet = (projIdx: number, insertAfterIdx?: number) => {
    const updated = [...(activeResume.projects || [])];
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
      emitChange({ projects: updated });
    }
  };

  const handleDeleteProjectBullet = (projIdx: number, bulletIdx: number) => {
    const updated = [...(activeResume.projects || [])];
    if (updated[projIdx]) {
      const currentHighlights = updated[projIdx].highlights || [updated[projIdx].description];
      const highlights = currentHighlights.filter((_, i) => i !== bulletIdx);
      updated[projIdx] = { ...updated[projIdx], highlights, description: highlights.join(' ') };
      emitChange({ projects: updated });
    }
  };

  // --- Handlers for Skill edits ---
  const handleUpdateSkillsCategory = (catName: string, newSkillsListStr: string) => {
    const newNames = newSkillsListStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const otherSkills = (activeResume.skills || []).filter((s) => (s.category || 'Core Technologies') !== catName);
    const updatedCategorySkills: SkillItem[] = newNames.map((name) => ({
      id: crypto.randomUUID(),
      name,
      category: catName as SkillCategory,
      proficiency: 'Advanced',
    }));

    emitChange({ skills: [...otherSkills, ...updatedCategorySkills] });
  };

  // Group skills by category
  const skillGroups = (activeResume.skills || []).reduce<Record<string, string[]>>((acc, s) => {
    const cat = s.category || 'Core Technologies';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {});

  // Formulate contact items with hyperlinks
  const contactItems: React.ReactNode[] = [
    profile.phone && <span key="phone">{profile.phone}</span>,
    profile.email && (
      <a
        key="email"
        href={`mailto:${profile.email}`}
        className="hover:underline text-blue-700 print:text-black print:no-underline"
      >
        {profile.email}
      </a>
    ),
    profile.location && <span key="loc">{profile.location}</span>,
    profile.linkedinUrl && (
      <a
        key="li"
        href={normalizeLinkedInUrl(profile.linkedinUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline text-blue-700 print:text-black print:no-underline"
      >
        {formatLinkedInDisplay(profile.linkedinUrl)}
      </a>
    ),
    profile.githubUrl && (
      <a
        key="gh"
        href={normalizeGitHubUrl(profile.githubUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline text-blue-700 print:text-black print:no-underline"
      >
        {formatGitHubDisplay(profile.githubUrl)}
      </a>
    ),
    profile.websiteUrl && (
      <a
        key="web"
        href={normalizeUrl(profile.websiteUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline text-blue-700 print:text-black print:no-underline"
      >
        {formatDisplayUrl(profile.websiteUrl)}
      </a>
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-3 relative">
      {/* Floating Sticky Antigravity Review Toolbar over the live canvas */}
      {stagedDiff && (
        <div className="sticky top-2 z-40 mx-auto max-w-xl flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white shadow-2xl border border-indigo-500/50 print:hidden animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-300"></span>
            </span>
            <div className="truncate">
              <span className="font-bold text-xs">Reviewing AI Changes:</span>{' '}
              <span className="text-xs text-slate-300 truncate">{stagedDiff.changeDescription}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onAcceptStaged && (
              <button
                type="button"
                onClick={onAcceptStaged}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Changes</span>
              </button>
            )}
            {onRejectStaged && (
              <button
                type="button"
                onClick={onRejectStaged}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-700 hover:bg-rose-600/90 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top controls bar */}
      {showControls && !isDiffMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Interactive Harvard ATS Format</span>
            </span>
            {editable && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                Click any line to edit
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {kw.size > 0 && (
              <button
                type="button"
                onClick={() => setEnableHighlight((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 font-medium cursor-pointer transition-colors"
              >
                {enableHighlight ? <Eye className="w-3.5 h-3.5 text-amber-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{enableHighlight ? 'Keywords Highlighted' : 'Clean View'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* A4 Paper Sheet Container — Calibrated Harvard/Ivy League ATS Typography */}
      <div
        id="tailored-resume-preview"
        className="bg-white text-slate-900 shadow-2xl mx-auto rounded-xs print:shadow-none print:m-0"
        style={{
          width: '816px',
          minHeight: '1056px',
          padding: '38px 48px', // Calibrated padding for single-page budget
          fontFamily: '"Times New Roman", Times, "Cambria", Georgia, serif',
          fontSize: '10.5px',
          lineHeight: 1.28, // Tight, balanced line height
          color: '#0f172a',
          boxSizing: 'border-box',
        }}
      >
        {/* Header: Candidate Name & Contact Line */}
        <div className="text-center mb-2">
          <h1
            className="font-bold tracking-tight text-slate-950 print:text-black uppercase"
            style={{ fontSize: '23px', letterSpacing: '0.04em' }}
          >
            {profile.name}
          </h1>

          {profile.title && (
            <p className="text-[11px] font-semibold text-slate-700 print:text-black mt-0.5 tracking-wide">
              {profile.title}
            </p>
          )}

          {contactItems.length > 0 && (
            <p className="text-center mt-1 text-[9.5px] text-slate-600 print:text-black leading-snug">
              {contactItems.reduce<React.ReactNode[]>((acc, el, i) => {
                if (i > 0) {
                  acc.push(
                    <span key={`sep-${i}`} className="mx-1.5 text-slate-400 print:text-black">
                      |
                    </span>
                  );
                }
                acc.push(el);
                return acc;
              }, [])}
            </p>
          )}
        </div>

        {/* Section 1: Professional Summary (In-Situ Diff Capable) */}
        <div className="mb-2">
          <SectionHeader title="Professional Summary" />
          {isDiffMode && origResume && origResume.summary !== activeResume.summary ? (
            <div className="text-[10px] leading-[1.32] text-justify text-slate-800 print:text-black block">
              {renderInSituTextDiff(origResume.summary, activeResume.summary)}
            </div>
          ) : (
            <EditableField
              as="p"
              value={activeResume.summary}
              onChange={(val) => emitChange({ summary: val })}
              editable={editable && !isDiffMode}
              keywords={kw}
              enableHighlight={enableHighlight}
              className="text-[10px] leading-[1.32] text-justify text-slate-800 print:text-black block"
              placeholder="Click to write your professional summary..."
            />
          )}
        </div>

        {/* Section 2: Technical Skills (In-Situ Diff Capable) */}
        <div className="mb-2">
          <SectionHeader title="Technical Skills" />
          <div className="space-y-0.5 text-[10px] leading-[1.32]">
            {Object.entries(skillGroups).map(([category, skills]) => {
              // In diff mode, highlight added and removed skills in this category
              if (isDiffMode && origResume) {
                const origCategorySkills = new Set(
                  (origResume.skills || [])
                    .filter((s) => (s.category || 'Core Technologies') === category)
                    .map((s) => s.name.toLowerCase().trim())
                );
                const propCategorySkills = new Set(
                  skills.map((s) => s.toLowerCase().trim())
                );

                const addedNames = skills.filter(
                  (s) => !origCategorySkills.has(s.toLowerCase().trim())
                );
                const removedNames = (origResume.skills || [])
                  .filter((s) => (s.category || 'Core Technologies') === category)
                  .map((s) => s.name)
                  .filter((name) => !propCategorySkills.has(name.toLowerCase().trim()));

                const unchangedNames = skills.filter((s) =>
                  origCategorySkills.has(s.toLowerCase().trim())
                );

                return (
                  <div key={category} className="flex items-baseline group">
                    <span className="font-bold text-slate-950 print:text-black min-w-[125px] shrink-0">
                      {category}:
                    </span>
                    <div className="text-slate-800 print:text-black flex-1 flex flex-wrap items-center gap-1">
                      {unchangedNames.map((name, idx) => (
                        <span key={idx}>
                          {name}
                          {idx < unchangedNames.length - 1 || addedNames.length > 0 ? ', ' : ''}
                        </span>
                      ))}
                      {addedNames.map((name, idx) => (
                        <ins
                          key={`add-${idx}`}
                          className="bg-emerald-50 text-emerald-800 border-b border-emerald-400 no-underline px-1 py-0.2 rounded-[2px] font-medium print:bg-transparent print:text-black print:border-none print:font-normal"
                        >
                          +{name}
                          {idx < addedNames.length - 1 ? ', ' : ''}
                        </ins>
                      ))}
                      {removedNames.map((name, idx) => (
                        <del
                          key={`rem-${idx}`}
                          className="bg-rose-50 text-rose-700 line-through px-1 py-0.2 rounded-[2px] print:hidden"
                        >
                          —{name}
                        </del>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={category} className="flex items-baseline group">
                  <span className="font-bold text-slate-950 print:text-black min-w-[125px] shrink-0">
                    {category}:
                  </span>
                  <EditableField
                    as="span"
                    value={skills.join(', ')}
                    onChange={(newSkillsStr) => handleUpdateSkillsCategory(category, newSkillsStr)}
                    editable={editable && !isDiffMode}
                    keywords={kw}
                    enableHighlight={enableHighlight}
                    className="text-slate-800 print:text-black flex-1"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Work Experience (In-Situ Diff Capable) */}
        {activeResume.experiences && activeResume.experiences.length > 0 && (
          <div className="mb-2">
            <SectionHeader title="Professional Experience" />
            <div className="space-y-1.5">
              {activeResume.experiences.map((exp, expIdx) => {
                const origExp = origResume?.experiences?.find(
                  (oe) => oe.company.toLowerCase().trim() === exp.company.toLowerCase().trim()
                ) || origResume?.experiences?.[expIdx];

                const origBullets = origExp?.highlights || [];
                const propBullets = exp.highlights || [];

                return (
                  <div key={exp.id || expIdx} className="space-y-0.5 group relative">
                    {/* Two-Column Aligned Header: Role & Company (Left) | Date & Location (Right) */}
                    <div className="flex justify-between items-baseline text-[10.5px]">
                      <div className="flex items-baseline gap-1.5">
                        <EditableField
                          value={exp.role}
                          onChange={(val) => handleUpdateExp(expIdx, 'role', val)}
                          editable={editable && !isDiffMode}
                          keywords={kw}
                          enableHighlight={enableHighlight}
                          className="font-bold text-slate-950 print:text-black"
                        />
                        <span className="text-slate-400 print:text-black">&mdash;</span>
                        <EditableField
                          value={exp.company}
                          onChange={(val) => handleUpdateExp(expIdx, 'company', val)}
                          editable={editable && !isDiffMode}
                          keywords={kw}
                          enableHighlight={enableHighlight}
                          className="font-semibold text-slate-800 print:text-black"
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
                          editable={editable && !isDiffMode}
                          className="text-slate-600 print:text-black"
                        />
                        {exp.location && (
                          <>
                            <span className="text-slate-400 print:text-black">|</span>
                            <EditableField
                              value={exp.location}
                              onChange={(val) => handleUpdateExp(expIdx, 'location', val)}
                              editable={editable && !isDiffMode}
                              className="text-slate-600 print:text-black"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Highlights Bullet Points with In-Situ Diff */}
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] leading-[1.28] text-slate-800 print:text-black">
                      {isDiffMode && origExp
                        ? propBullets.map((highlight, hIdx) => {
                            const origHighlight = origBullets[hIdx];
                            const isAdded = !origBullets.some(
                              (ob) => ob.trim().toLowerCase() === highlight.trim().toLowerCase()
                            );

                            if (isAdded && !origHighlight) {
                              return (
                                <li key={hIdx} className="pl-0.5">
                                  <ins className="bg-emerald-50 text-emerald-800 border-b border-emerald-400 no-underline px-0.5 rounded-[1px] font-medium print:bg-transparent print:text-black print:border-none print:font-normal">
                                    {highlight}
                                  </ins>
                                </li>
                              );
                            }

                            if (origHighlight && origHighlight !== highlight) {
                              return (
                                <li key={hIdx} className="pl-0.5">
                                  {renderInSituTextDiff(origHighlight, highlight)}
                                </li>
                              );
                            }

                            return (
                              <li key={hIdx} className="pl-0.5">
                                <span>{highlight}</span>
                              </li>
                            );
                          })
                        : propBullets.map((highlight, hIdx) => (
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
                                editable={editable && !isDiffMode}
                                keywords={kw}
                                enableHighlight={enableHighlight}
                                className="inline"
                              />
                              {editable && !isDiffMode && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpBullet(expIdx, hIdx)}
                                  title="Delete bullet"
                                  className="opacity-0 group-hover/bullet:opacity-100 ml-1.5 inline-flex items-center text-slate-400 hover:text-rose-600 print:hidden cursor-pointer align-middle"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </li>
                          ))}

                      {/* Display removed bullets in red strikethrough if in diff mode */}
                      {isDiffMode &&
                        origBullets
                          .filter(
                            (ob) =>
                              !propBullets.some(
                                (pb) => pb.trim().toLowerCase() === ob.trim().toLowerCase()
                              )
                          )
                          .map((remBullet, rIdx) => (
                            <li key={`rem-${rIdx}`} className="pl-0.5 print:hidden">
                              <del className="bg-rose-50 text-rose-700 line-through px-0.5 rounded-[1px]">
                                {remBullet}
                              </del>
                            </li>
                          ))}
                    </ul>

                    {/* Zero-Height Hover Overlay: Add Bullet Button (Consumes 0px in document flow) */}
                    {editable && !isDiffMode && (
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: Key Engineering Projects (STAR Bullets & In-Situ Diff Capable) */}
        {activeResume.projects && activeResume.projects.length > 0 && (
          <div className="mb-2">
            <SectionHeader title="Key Engineering Projects" />
            <div className="space-y-1.5">
              {activeResume.projects.map((proj, projIdx) => {
                const projectBullets =
                  proj.highlights && proj.highlights.length > 0
                    ? proj.highlights
                    : proj.description.includes('\n')
                    ? proj.description.split('\n').filter(Boolean)
                    : [proj.description];

                const origProj = origResume?.projects?.find(
                  (op) => op.title.toLowerCase().trim() === proj.title.toLowerCase().trim()
                ) || origResume?.projects?.[projIdx];

                const origPBullets = origProj?.highlights || (origProj?.description ? [origProj.description] : []);

                return (
                  <div key={proj.id || projIdx} className="space-y-0.5 group relative">
                    <div className="flex justify-between items-baseline text-[10.5px]">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <EditableField
                          value={proj.title}
                          onChange={(val) => handleUpdateProject(projIdx, 'title', val)}
                          editable={editable && !isDiffMode}
                          keywords={kw}
                          enableHighlight={enableHighlight}
                          className="font-bold text-slate-950 print:text-black"
                        />
                        {proj.techStack && proj.techStack.length > 0 && (
                          <span className="text-[9.5px] text-slate-600 print:text-black italic">
                            ({proj.techStack.join(', ')})
                          </span>
                        )}
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
                      </div>
                    </div>

                    {/* Structured STAR Bullet Points with In-Situ Diff */}
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] leading-[1.28] text-slate-800 print:text-black">
                      {isDiffMode && origProj
                        ? projectBullets.map((bullet, bIdx) => {
                            const origB = origPBullets[bIdx];
                            if (origB && origB !== bullet) {
                              return (
                                <li key={bIdx} className="pl-0.5">
                                  {renderInSituTextDiff(origB, bullet)}
                                </li>
                              );
                            }
                            return (
                              <li key={bIdx} className="pl-0.5">
                                <span>{bullet}</span>
                              </li>
                            );
                          })
                        : projectBullets.map((bullet, bIdx) => (
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
                                editable={editable && !isDiffMode}
                                keywords={kw}
                                enableHighlight={enableHighlight}
                                className="inline"
                              />
                              {editable && !isDiffMode && projectBullets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProjectBullet(projIdx, bIdx)}
                                  title="Delete project bullet"
                                  className="opacity-0 group-hover/pbullet:opacity-100 ml-1.5 inline-flex items-center text-slate-400 hover:text-rose-600 print:hidden cursor-pointer align-middle"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </li>
                          ))}
                    </ul>

                    {/* Zero-Height Hover Overlay: Add Project Bullet Button */}
                    {editable && !isDiffMode && (
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 5: Education (Formatted cleanly with Graduated Year and 'at' institution) */}
        {activeResume.education && activeResume.education.length > 0 && (
          <div className="mb-2">
            <SectionHeader title="Education" />
            <div className="space-y-1">
              {activeResume.education.map((edu, eduIdx) => (
                <div key={edu.id || eduIdx} className="space-y-0.5">
                  <div className="flex justify-between items-baseline text-[10.5px]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-slate-950 print:text-black">{edu.degree}</span>
                      {edu.fieldOfStudy && (
                        <>
                          <span className="text-slate-400 print:text-black">in</span>
                          <span className="font-semibold text-slate-800 print:text-black">
                            {edu.fieldOfStudy}
                          </span>
                        </>
                      )}
                      {edu.grade && (
                        <span className="text-[9.5px] text-slate-600 print:text-black">
                          ({edu.grade})
                        </span>
                      )}
                    </div>
                    <div className="text-right text-[9.5px] font-medium text-slate-600 print:text-black shrink-0">
                      {formatEducationDate(edu.startDate, edu.endDate)}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-700 print:text-black font-semibold">
                    at {edu.institution}
                  </p>

                  {edu.details && (
                    <p className="text-[9.5px] text-slate-600 print:text-black italic">{edu.details}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Embedded print stylesheet rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          #tailored-resume-preview {
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
          del {
            display: none !important;
          }
          ins {
            background: transparent !important;
            color: black !important;
            border: none !important;
            text-decoration: none !important;
            font-weight: normal !important;
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
