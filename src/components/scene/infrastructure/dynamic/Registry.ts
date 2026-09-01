import GenericZone from './components/GenericZone';
import {
    CFSAreaWrapper,
    WarehouseWrapper,
    TruckWrapper,
    RestingRoomWrapper,
    GeneratorRoomWrapper,
    TerminalDispatchOfficeWrapper,
    TerminalOfficeWrapper,
    CabinOfficeWrapper
} from './components/InfrastructureWrappers';

// Mapping of JSON 'type' to React Component
// Note: Block types are NOT registered here -- 'container_block' (Dammam) and
// 'container_block_a'..'_e' (Jeddah) alike. They are rendered by IcdMarkings
// (SlotMarkings + BlockLabels), which handles slot grids, labels, and selection
// highlighting via instance colors. DynamicLayoutEngine skips any type containing
// 'block' before it reaches this map, so no placeholder entries are needed.
export const ComponentRegistry: Record<string, React.FC<any>> = {
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
    'trl_terminal': GenericZone,

    // 3D Infrastructure Components
    'cfs_area': CFSAreaWrapper,
    'warehouse': WarehouseWrapper,
    'truck': TruckWrapper,

    // Buildings (Mapped to Specific Wrappers)
    'resting_room': RestingRoomWrapper,
    'generator_room': GeneratorRoomWrapper,
    'terminal_office': TerminalOfficeWrapper,
    'terminal_dispatch_office': TerminalDispatchOfficeWrapper,
    'cabin_office': CabinOfficeWrapper,

    // Fallback/Generic
    'zone': GenericZone
};
