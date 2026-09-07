'use client';

import React, { useState, useMemo } from 'react';
import { ApplicationCard, KanbanStatus, KANBAN_COLUMNS, toApplicationCard } from '@/types';
import { useApp } from '@/context/AppContext';
import { KanbanColumnView } from './KanbanColumn';

interface KanbanBoardProps {
  searchQuery?: string;
  onOpenDetails: (card: ApplicationCard) => void;
  onEdit: (card: ApplicationCard) => void;
  onAddNew: (status?: KanbanStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  searchQuery = '',
  onOpenDetails,
  onEdit,
  onAddNew,
}) => {
  const { applications, moveApplication } = useApp();
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // Convert JobApplication[] to ApplicationCard[]
  const cards: ApplicationCard[] = useMemo(() => {
    return applications.map(toApplicationCard);
  }, [applications]);

  // Filter cards by search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.salary && c.salary.toLowerCase().includes(q))
    );
  }, [cards, searchQuery]);

  // Group cards by Kanban status
  const cardsByColumn = useMemo(() => {
    const map: Record<KanbanStatus, ApplicationCard[]> = {
      wishlist: [],
      applied: [],
      interviewing: [],
      offer: [],
      rejected: [],
    };

    filteredCards.forEach((card) => {
      if (map[card.status]) {
        map[card.status].push(card);
      } else {
        map.applied.push(card);
      }
    });

    return map;
  }, [filteredCards]);

  const handleCardDrop = (cardId: string, targetStatus: KanbanStatus) => {
    moveApplication(cardId, targetStatus);
  };

  return (
    <div className="w-full overflow-x-auto pb-6 scrollbar-thin">
      <div className="flex gap-4 min-w-[1200px] items-start">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumnView
            key={column.id}
            column={column}
            cards={cardsByColumn[column.id] || []}
            onCardDrop={handleCardDrop}
            onOpenDetails={onOpenDetails}
            onEdit={onEdit}
            onAddNew={(status) => onAddNew(status)}
            draggedCardId={draggedCardId}
            setDraggedCardId={setDraggedCardId}
          />
        ))}
      </div>
    </div>
  );
};
