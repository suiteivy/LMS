/**
 * DemoPulseButton — Replaced basic pulse with Premium Aura DemoButton.
 * Complies with Section 2 of Landing Page Fixes.
 * Re-exports DemoButton for 100% backwards compatibility.
 */
import React from 'react';
import { DemoButton, DemoButtonProps } from './DemoButton';

export const DemoPulseButton: React.FC<DemoButtonProps> = (props) => {
  return <DemoButton {...props} />;
};

export default DemoPulseButton;
export { DemoButton };
