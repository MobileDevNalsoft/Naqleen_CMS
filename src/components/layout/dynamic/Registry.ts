import GenericZone from './components/GenericZone';
import { CFSAreaWrapper, WarehouseWrapper, TruckWrapper } from './components/InfrastructureWrappers';

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

    // Buildings (Mapped to WarehouseWrapper)
    'resting_room': WarehouseWrapper,
    'generator_room': WarehouseWrapper,
    'terminal_office': WarehouseWrapper,
    'terminal_dispatch_office': WarehouseWrapper,

    // Ignored Types (Handled separately but registered to silence warnings)
    'container_block_a': NullComponent,

    // Fallback/Generic
    'zone': GenericZone
};
