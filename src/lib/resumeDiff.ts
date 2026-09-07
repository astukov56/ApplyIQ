import type { ResumeVersion } from '@/types/resume';
import type { SectionDiff, DiffItem } from '@/types/tailor';

/**
 * Pure client-side semantic diff engine that compares original and proposed ResumeVersion snapshots.
 * Returns clean SectionDiff[] items highlighting additions and removals.
 */
export function computeResumeDiff(
  original: ResumeVersion,
  proposed: ResumeVersion
): SectionDiff[] {
  const sections: SectionDiff[] = [];

  // 1. Professional Summary Diff
  if (original.summary.trim() !== proposed.summary.trim()) {
    const diffs: DiffItem[] = [];
    if (original.summary.trim()) {
      diffs.push({ type: 'removed', text: original.summary.trim() });
    }
    if (proposed.summary.trim()) {
      diffs.push({ type: 'added', text: proposed.summary.trim() });
    }
    sections.push({
      section: 'Professional Summary',
      diffs,
    });
  }

  // 2. Technical Skills Diff
  const origSkills = new Set((original.skills || []).map((s) => s.name.toLowerCase().trim()));
  const propSkills = new Set((proposed.skills || []).map((s) => s.name.toLowerCase().trim()));

  const addedSkills = (proposed.skills || []).filter(
    (s) => !origSkills.has(s.name.toLowerCase().trim())
  );
  const removedSkills = (original.skills || []).filter(
    (s) => !propSkills.has(s.name.toLowerCase().trim())
  );

  if (addedSkills.length > 0 || removedSkills.length > 0) {
    const diffs: DiffItem[] = [];
    removedSkills.forEach((s) =>
      diffs.push({ type: 'removed', text: `${s.name} (${s.category})` })
    );
    addedSkills.forEach((s) =>
      diffs.push({ type: 'added', text: `${s.name} (${s.category})` })
    );
    sections.push({
      section: 'Technical Skills',
      diffs,
    });
  }

  // 3. Professional Experience Diff
  const origExpMap = new Map((original.experiences || []).map((e) => [e.company.toLowerCase().trim(), e]));

  (proposed.experiences || []).forEach((propExp) => {
    const key = propExp.company.toLowerCase().trim();
    const origExp = origExpMap.get(key);

    if (!origExp) {
      // Entirely new role added
      sections.push({
        section: 'Professional Experience',
        title: `${propExp.role} at ${propExp.company}`,
        diffs: [
          { type: 'added', text: `New Role: ${propExp.role} at ${propExp.company} (${propExp.startDate} - ${propExp.endDate})` },
          ...(propExp.highlights || []).map((h) => ({ type: 'added' as const, text: h })),
        ],
      });
    } else {
      // Check for bullet differences
      const origBullets = new Set((origExp.highlights || []).map((h) => h.trim()));
      const propBullets = new Set((propExp.highlights || []).map((h) => h.trim()));

      const addedBullets = (propExp.highlights || []).filter((h) => !origBullets.has(h.trim()));
      const removedBullets = (origExp.highlights || []).filter((h) => !propBullets.has(h.trim()));

      if (addedBullets.length > 0 || removedBullets.length > 0 || origExp.role !== propExp.role) {
        const diffs: DiffItem[] = [];
        if (origExp.role !== propExp.role) {
          diffs.push({ type: 'removed', text: `Role: ${origExp.role}` });
          diffs.push({ type: 'added', text: `Role: ${propExp.role}` });
        }
        removedBullets.forEach((b) => diffs.push({ type: 'removed', text: b }));
        addedBullets.forEach((b) => diffs.push({ type: 'added', text: b }));

        sections.push({
          section: 'Professional Experience',
          title: `${propExp.company} (${propExp.role})`,
          diffs,
        });
      }
    }
  });

  // Check for deleted roles
  const propCompanyKeys = new Set((proposed.experiences || []).map((e) => e.company.toLowerCase().trim()));
  (original.experiences || []).forEach((origExp) => {
    const key = origExp.company.toLowerCase().trim();
    if (!propCompanyKeys.has(key)) {
      sections.push({
        section: 'Professional Experience',
        title: `${origExp.company} (Removed Role)`,
        diffs: [{ type: 'removed', text: `Removed: ${origExp.role} at ${origExp.company}` }],
      });
    }
  });

  // 4. Key Engineering Projects Diff
  const origProjMap = new Map((original.projects || []).map((p) => [p.title.toLowerCase().trim(), p]));

  (proposed.projects || []).forEach((propProj) => {
    const key = propProj.title.toLowerCase().trim();
    const origProj = origProjMap.get(key);

    if (!origProj) {
      sections.push({
        section: 'Key Engineering Projects',
        title: propProj.title,
        diffs: [{ type: 'added', text: `New Project: ${propProj.title} - ${propProj.description}` }],
      });
    } else {
      const diffs: DiffItem[] = [];
      if (origProj.description.trim() !== propProj.description.trim()) {
        diffs.push({ type: 'removed', text: origProj.description.trim() });
        diffs.push({ type: 'added', text: propProj.description.trim() });
      }

      // Check highlights if present
      const origHigh = new Set(origProj.highlights || []);
      const propHigh = new Set(propProj.highlights || []);
      const addedHigh = (propProj.highlights || []).filter((h) => !origHigh.has(h));
      const removedHigh = (origProj.highlights || []).filter((h) => !propHigh.has(h));

      removedHigh.forEach((h) => diffs.push({ type: 'removed', text: h }));
      addedHigh.forEach((h) => diffs.push({ type: 'added', text: h }));

      if (diffs.length > 0) {
        sections.push({
          section: 'Key Engineering Projects',
          title: propProj.title,
          diffs,
        });
      }
    }
  });

  return sections;
}
