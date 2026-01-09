import { z } from 'zod';
import {
    ContainerTypeSchema,
    AnchorPositionSchema,
    RelativePlacementSchema,
    BlockPlacementSchema,
    BaseEntityPropsSchema,
    ContainerBlockPropsSchema,
    CFSAreaPropsSchema,
    WarehousePropsSchema,
    TruckPropsSchema,
    ZonePropsSchema,
    ContainerBlockEntitySchema,
    CFSAreaEntitySchema,
    WarehouseEntitySchema,
    TruckEntitySchema,
    ZoneEntitySchema,
    IcdEntitySchema,
    LotSpecsSchema,
    IcdLayoutSchema,
    IcdConfigSchema
} from './IcdSchema.zod';

// --- Inferred Types ---

export type ContainerType = z.infer<typeof ContainerTypeSchema>;
export type AnchorPosition = z.infer<typeof AnchorPositionSchema>;
export type RelativePlacement = z.infer<typeof RelativePlacementSchema>;
export type BlockPlacement = z.infer<typeof BlockPlacementSchema>;

export type BaseEntityProps = z.infer<typeof BaseEntityPropsSchema>;
export type ContainerBlockProps = z.infer<typeof ContainerBlockPropsSchema>;
export type CFSAreaProps = z.infer<typeof CFSAreaPropsSchema>;
export type WarehouseProps = z.infer<typeof WarehousePropsSchema>;
export type TruckProps = z.infer<typeof TruckPropsSchema>;
export type ZoneProps = z.infer<typeof ZonePropsSchema>;

export type ContainerBlockEntity = z.infer<typeof ContainerBlockEntitySchema>;
export type CFSAreaEntity = z.infer<typeof CFSAreaEntitySchema>;
export type WarehouseEntity = z.infer<typeof WarehouseEntitySchema>;
export type TruckEntity = z.infer<typeof TruckEntitySchema>;
export type ZoneEntity = z.infer<typeof ZoneEntitySchema>;

export type IcdEntity = z.infer<typeof IcdEntitySchema>;
export type LotSpecs = z.infer<typeof LotSpecsSchema>;
export type IcdLayoutSchema = z.infer<typeof IcdLayoutSchema>;
export type IcdConfig = z.infer<typeof IcdConfigSchema>;
