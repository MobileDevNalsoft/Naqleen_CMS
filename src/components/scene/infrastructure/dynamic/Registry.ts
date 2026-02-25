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

// Silent component for entities handled by other systems (like IcdMarkings)
const NullComponent = () => null;

// Mapping of JSON 'type' to React Component
// Note: Block types (container_block_*) are NOT registered here.
// They are rendered by IcdMarkings (SlotMarkings + BlockLabels) which handles
// slot grids, labels, and selection highlighting via instance colors.
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

    // Ignored Types (Handled separately but registered to silence warnings)
    'container_block_a': NullComponent,

    // Fallback/Generic
    'zone': GenericZone
};
