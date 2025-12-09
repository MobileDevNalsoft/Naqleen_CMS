import GenericBlock from './components/GenericBlock';
import GenericZone from './components/GenericZone';

// Mapping of JSON 'type' to React Component
export const ComponentRegistry: Record<string, React.FC<any>> = {
    // Blocks (Extruded/Glowing)
    'container_block': GenericBlock,
    'container_block_a': GenericBlock, // Legacy support if needed
    'container_block_b': GenericBlock,
    'container_block_c': GenericBlock,
    'container_block_d': GenericBlock,

    // Zones (Flat/Textured)
    'road': GenericZone,
    'access': GenericZone,
    'customhouse': GenericZone,
    'toplift': GenericZone,
    'yard_base': GenericZone,
    'icd_divider': GenericZone,
    'custom': GenericZone,
    'trs_terminal': GenericZone,
    'trm_terminal': GenericZone,

    // Fallback/Generic
    'zone': GenericZone,
    'block': GenericBlock
};
