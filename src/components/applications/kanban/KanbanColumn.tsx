'use client';

import React, { useState } from 'react';
import { ApplicationCard, ApplicationColumn } from '@/types';
import { KanbanCard } from './KanbanCard';
import { Plus, Inbox } from 'lucide-react';

interface KanbanColumnProps {
  column: ApplicationColumn;
  cards: ApplicationCard[];
  onCardDrop: (cardId: string, targetStatus: ApplicationColumn['id']) => void;
  onOpenDetails: (card: ApplicationCard) => void;
  onEdit: (card: ApplicationCard) => void;
  onAddNew: (status: ApplicationColumn['id']) => void;
  draggedCardId: string | null;
  setDraggedCardId: (id: string | null) => void;
}

export const KanbanColumnView: React.FC<KanbanColumnProps> = ({
  column,
  cards,
  onCardDrop,
  onOpenDetails,
  onEdit,
  onAddNew,
  draggedCardId,
  setDraggedCardId,
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column element itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (cardId) {
      onCardDrop(cardId, column.id);
    }
    setDraggedCardId(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl border transition-all duration-200 min-w-[280px] max-w-[320px] w-full flex-1 shrink-0 bg-slate-50/60 dark:bg-slate-900/40 ${
        isOver
          ? 'ring-2 ring-indigo-500/80 border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-lg'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
      style={{ minHeight: '520px' }}
    >
      {/* Column Header */}
      <div className="p-3.5 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
            {column.title}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${column.badgeBg} ${column.badgeText}`}
          >
            {cards.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddNew(column.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          title={`Add job to ${column.title}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards List / Drop Target */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-thin">
        {cards.length === 0 ? (
          <div
            onClick={() => onAddNew(column.id)}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 ${
              isOver
                ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/40 dark:hover:bg-slate-800/30'
            }`}
          >
            <Inbox className="w-7 h-7 mb-2 opacity-50" />
            <p className="text-xs font-medium">No roles in {column.title}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Drop cards here or click to add
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onOpenDetails={onOpenDetails}
              onEdit={onEdit}
              isDragging={draggedCardId === card.id}
              onDragStart={(_, c) => setDraggedCardId(c.id)}
              onDragEnd={() => setDraggedCardId(null)}
            />
          ))
        )}
      </div>
    </div>
  );
};
