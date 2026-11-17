import React from 'react';
import { Tooltip, type TooltipProps } from './Tooltip';
import type { TooltipTargetId } from '@/components/settings/tooltips.config';

export interface ActionTooltipProps {
  targetId?: TooltipTargetId;
  text?: string;
  label?: string;
  description?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  learnMoreAnchor?: string;
  onLearnMore?: () => void;
  style?: any;
  className?: string;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
  targetId,
  text,
  label,
  description,
  children,
  position = 'top',
  learnMoreAnchor,
  onLearnMore,
  style,
  className,
}) => {
  return (
    <Tooltip
      targetId={targetId}
      text={text}
      label={label}
      description={description}
      position={position}
      learnMoreAnchor={learnMoreAnchor}
      onLearnMore={onLearnMore ? () => onLearnMore() : undefined}
      style={style}
      className={className}
    >
      {children}
    </Tooltip>
  );
};

export default ActionTooltip;
