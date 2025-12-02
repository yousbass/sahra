/**
 * Refund Policy Badge Component
 * Displays refund policy status with tooltip
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { RefreshCw, XCircle } from 'lucide-react';

interface RefundPolicyBadgeProps {
  policy: 'refundable' | 'non-refundable';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const RefundPolicyBadge: React.FC<RefundPolicyBadgeProps> = ({
  policy,
  size = 'md',
  showTooltip = true,
}) => {
  const isRefundable = policy === 'refundable';
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  const badge = (
    <Badge
      className={`
        ${isRefundable ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'}
        ${sizeClasses[size]}
        border font-semibold
      `}
    >
      {isRefundable ? (
        <>
          <RefreshCw className="w-3 h-3 mr-1" />
          Refundable
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3 mr-1" />
          Non-Refundable
        </>
      )}
    </Badge>
  );
  
  if (!showTooltip) return badge;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {isRefundable ? (
              'Cancel up to 48 hours before check-in for full refund'
            ) : (
              'No refunds for cancellations'
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};