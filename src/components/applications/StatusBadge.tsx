import React from 'react';
import { ApplicationStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const s = String(status).toLowerCase();

  switch (s) {
    case 'wishlist':
    case 'saved':
      return (
        <Badge variant="neutral" size={size} dot={showDot}>
          Wishlist
        </Badge>
      );
    case 'applied':
      return (
        <Badge variant="info" size={size} dot={showDot}>
          Applied
        </Badge>
      );
    case 'assessment':
      return (
        <Badge variant="purple" size={size} dot={showDot}>
          Assessment
        </Badge>
      );
    case 'interview':
    case 'interviewing':
      return (
        <Badge variant="warning" size={size} dot={showDot}>
          Interviewing
        </Badge>
      );
    case 'offer':
      return (
        <Badge variant="success" size={size} dot={showDot}>
          Offer
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="danger" size={size} dot={showDot}>
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size={size} dot={showDot}>
          {status}
        </Badge>
      );
  }
};
