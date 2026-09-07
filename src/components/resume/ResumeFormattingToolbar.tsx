'use client';

import React from 'react';
import {
  DocumentToolbar,
  DocumentToolbarProps,
} from '@/components/common/DocumentToolbar';

export type ResumeFormattingToolbarProps = Omit<DocumentToolbarProps, 'documentType'>;

export function ResumeFormattingToolbar(props: ResumeFormattingToolbarProps) {
  return <DocumentToolbar documentType="resume" {...props} />;
}

export { DocumentToolbar };
