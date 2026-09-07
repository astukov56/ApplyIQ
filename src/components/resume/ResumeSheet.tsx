'use client';

import React from 'react';
import type { ResumeVersion } from '@/types/resume';
import type { CandidateProfile } from '@/types/profile';
import { TailoredResumePreview } from '@/components/tailor/TailoredResumePreview';

export interface ResumeSheetProps {
  resume: ResumeVersion;
  profile: CandidateProfile;
  /** Set of keywords to highlight on the document */
  highlightKeywords?: Set<string>;
}

export function ResumeSheet({
  resume,
  profile,
  highlightKeywords = new Set(),
}: ResumeSheetProps) {
  return (
    <TailoredResumePreview
      resume={resume}
      profile={profile}
      highlightKeywords={highlightKeywords}
      showControls={false}
    />
  );
}
