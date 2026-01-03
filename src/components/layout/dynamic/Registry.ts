import GenericBlock from './components/GenericBlock';
import GenericZone from './components/GenericZone';
import { CFSAreaWrapper, WarehouseWrapper, TruckWrapper } from './components/InfrastructureWrappers';

// Mapping of JSON 'type' to React Component
export const ComponentRegistry: Record<string, React.FC<any>> = {
    // Blocks (Extruded/Glowing)
    'container_block': GenericBlock,
    'container_block_a': GenericBlock, // Legacy support if needed
    'container_block_b': GenericBlock,
    'container_block_c': GenericBlock,
    'container_block_d': GenericBlock,
    'container_block_e': GenericBlock, // New block type

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
    'trl_terminal': GenericZone, // TRL terminal type

    // 3D Infrastructure Components
    'cfs_area': CFSAreaWrapper,
    'warehouse': WarehouseWrapper,
    'truck': TruckWrapper,

    // Fallback/Generic
    'zone': GenericZone,
    'block': GenericBlock
};


