import React from 'react';

interface EffectsWrapperProps {
    children: React.ReactNode;
}

/**
 * EffectsWrapper - A passthrough component for post-processing effects.
 * Currently acts as a simple wrapper. Can be extended to add bloom, SSAO, etc.
 */
export const EffectsWrapper: React.FC<EffectsWrapperProps> = ({ children }) => {
    return <>{children}</>;
};
