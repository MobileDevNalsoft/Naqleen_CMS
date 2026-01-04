import React from 'react';

interface GenericBlockProps {
    id: string;
    type: string;
    position: [number, number, number];
    rotation: number;
    dimensions?: { width: number; height: number };
    corner_points?: Array<{ x: number; z: number }>;
    isSelected: boolean;
    color?: string;
    props?: Record<string, any>;
}

/**
 * GenericBlock - Now a no-op component.
 * 
 * Block highlighting was previously done via an extruded overlay mesh.
 * This has been replaced with Telia-style dimming via instance colors
 * in the SlotMarkings component (IcdMarkings.tsx).
 * 
 * Non-selected blocks dim to dark gray (25% brightness).
 * Selected block stays at full white (100% brightness).
 */
const GenericBlock: React.FC<GenericBlockProps> = () => {
    // Telia-style dimming is now handled in SlotMarkings via instance colors.
    // This component is kept for API compatibility but renders nothing.
    return null;
};

export default GenericBlock;

