'use client';

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export interface EditableFieldProps {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  editable?: boolean;
  keywords?: Set<string>;
  enableHighlight?: boolean;
  as?: 'span' | 'p' | 'div' | 'li' | 'h1';
  placeholder?: string;
}

/**
 * Highlights target ATS keywords with elegant styling when unfocused,
 * while converting to plain bold in print.
 */
export function highlightText(
  text: string,
  keywords: Set<string>,
  enableHighlight = true
): React.ReactNode {
  if (!enableHighlight || !keywords.size || !text) return text;
  const pattern = new RegExp(
    `(${[...keywords].map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    keywords.has(part.toLowerCase()) ? (
      <mark
        key={i}
        className="bg-amber-100 text-amber-950 font-semibold px-0.5 rounded-[2px] decoration-clone print:bg-transparent print:text-black print:font-bold"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SectionDivider() {
  return <div className="border-t border-slate-900 mt-1 mb-2.5 print:border-black" />;
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-3.5 mb-1">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-900 print:text-black">
          {title}
        </h2>
        {action && <div className="print:hidden">{action}</div>}
      </div>
      <SectionDivider />
    </div>
  );
}

/**
 * Intelligent inline-editable text component:
 * - When focused: pure editable text (preserves natural caret & typing behavior).
 * - When unfocused: displays ATS keyword highlights or formatted text.
 * - Keyboard shortcuts: supports Enter / Backspace delegation for bullet lists.
 * - Pure print styles: hides editing borders/focus outlines in @media print.
 */
export function EditableField({
  value,
  onChange,
  onKeyDown,
  className,
  style,
  editable = true,
  keywords = new Set(),
  enableHighlight = true,
  as: Component = 'span',
  placeholder = '',
}: EditableFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Sync content when value changes externally (e.g. from parent/AI)
  useEffect(() => {
    if (ref.current && !isFocused && ref.current.innerText !== (value || '')) {
      ref.current.innerText = value || '';
    }
  }, [value, isFocused]);

  if (!editable) {
    return (
      <Component className={className} style={style}>
        {highlightText(value, keywords, enableHighlight)}
      </Component>
    );
  }

  return (
    <Component
      ref={ref as any}
      contentEditable={editable}
      suppressContentEditableWarning
      style={style}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        setIsFocused(false);
        const newText = e.currentTarget.innerText.trim();
        if (newText !== value) {
          onChange(newText);
        }
      }}
      onKeyDown={(e) => {
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      className={clsx(
        className,
        'transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-400/80 focus:bg-indigo-50/25 rounded-[2px] px-0.5 -mx-0.5 print:ring-0 print:bg-transparent',
        editable && 'hover:bg-slate-100/60 cursor-text print:hover:bg-transparent'
      )}
      data-placeholder={placeholder}
    >
      {isFocused ? value : highlightText(value, keywords, enableHighlight)}
    </Component>
  );
}
