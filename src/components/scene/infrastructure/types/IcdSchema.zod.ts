import { z } from 'zod';

// --- Shared Constants & Enums ---
export const ContainerTypeSchema = z.enum(['20ft', '40ft', '45ft']);
export const AnchorPositionSchema = z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'center']);
export const RelativePlacementSchema = z.enum(['below', 'above', 'left', 'right']);

// --- Helper Sub-Schemas ---
export const BlockPlacementSchema = z.object({
    anchor: AnchorPositionSchema.optional(),
    relative_to: z.string().optional(),
    placement: RelativePlacementSchema.optional(),
    gap: z.number().optional(),
    offset_x: z.number().optional(),
    offset_z: z.number().optional(),
});

export const BaseEntityPropsSchema = z.object({
    description: z.string().optional(),
});

export const DimensionsSchema = z.object({
    width: z.number(),
    height: z.number(),
    unit: z.string().optional(),
});

export const PositionSchema = z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    unit: z.string().optional(),
});

// --- Component Props Schemas ---

export const ContainerBlockPropsSchema = BaseEntityPropsSchema.extend({
    color: z.string().optional(),
    container_type: ContainerTypeSchema,
    lots: z.number().int().positive(),
    rows: z.number().int().positive(),
    block_width: z.number().optional(),
    block_depth: z.number().optional(),
    lot_gap: z.number().optional(),
    row_labels: z.array(z.string()).optional(),
    row_labels_side: z.enum(['left', 'right', 'both']).optional(),
    lot_numbers: z.array(z.number()).optional(),
    lot_gaps: z.record(z.string(), z.number()).optional(),
    excluded_slots: z.array(
        z.object({
            lot: z.number(),
            row: z.union([z.string(), z.number()]),
        })
    ).optional(),
});

export const CFSAreaPropsSchema = BaseEntityPropsSchema.extend({
    capacity: z.number().optional(),
});

export const WarehousePropsSchema = BaseEntityPropsSchema.extend({
    gate_count: z.number().optional(),
    is_bonded: z.boolean().optional(),
});

export const TruckPropsSchema = BaseEntityPropsSchema.extend({
    containerColor: z.string().optional(),
    hasContainer: z.boolean().optional(),
});

export const ZonePropsSchema = BaseEntityPropsSchema.extend({
    color: z.string().optional(),
    opacity: z.number().optional(),
});

// --- Entity Schemas ---

const BaseEntitySchema = z.object({
    id: z.string(),
    position: PositionSchema,
    rotation: z.number().optional(),
    dimensions: DimensionsSchema.optional(),
    corner_points: z.array(z.object({ x: z.number(), z: z.number() })).optional(),
    placement: BlockPlacementSchema.optional(),
    name: z.string().optional(),
});

export const ContainerBlockEntitySchema = BaseEntitySchema.extend({
    type: z.enum([
        'container_block',
        'container_block_a',
        'container_block_b',
        'container_block_c',
        'container_block_d',
        'container_block_e',
    ]),
    props: ContainerBlockPropsSchema,
});

export const CFSAreaEntitySchema = BaseEntitySchema.extend({
    type: z.literal('cfs_area'),
    props: CFSAreaPropsSchema.optional(),
});

export const WarehouseEntitySchema = BaseEntitySchema.extend({
    type: z.literal('warehouse'),
    props: WarehousePropsSchema.optional(),
});

export const TruckEntitySchema = BaseEntitySchema.extend({
    type: z.literal('truck'),
    props: TruckPropsSchema.optional(),
});

export const ZoneEntitySchema = BaseEntitySchema.extend({
    type: z.enum([
        'yard_base',
        'road',
        'access',
        'customhouse',
        'toplift',
        'icd_divider',
        'trs_terminal',
        'trm_terminal',
        'trl_terminal',
    ]),
    props: ZonePropsSchema.optional(),
});

export const SpecialtyBuildingEntitySchema = BaseEntitySchema.extend({
    type: z.enum([
        'resting_room',
        'generator_room',
        'terminal_dispatch_office',
        'terminal_office',
        'cabin_office',
    ]),
    props: BaseEntityPropsSchema.optional(),
});

export const IcdEntitySchema = z.union([
    ContainerBlockEntitySchema,
    CFSAreaEntitySchema,
    WarehouseEntitySchema,
    TruckEntitySchema,
    ZoneEntitySchema,
    SpecialtyBuildingEntitySchema,
]);

// --- Root Layout Schema ---

export const LotSpecsSchema = z.object({
    '20ft': z.object({ lot_length: z.number(), lot_gap: z.number(), row_width: z.number(), row_gap: z.number() }).optional(),
    '40ft': z.object({ lot_length: z.number(), lot_gap: z.number(), row_width: z.number(), row_gap: z.number() }).optional(),
});

export const IcdLayoutSchema = z.object({
    id: z.string(),
    name: z.string(),
    location: z.string(),
    total_dimensions: z.object({
        width: z.number(),
        height: z.number(),
        lot_specs: LotSpecsSchema.optional(),
        inner_padding: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }).optional(),
        corner_points: z.array(z.object({ x: z.number(), z: z.number() })).optional(),
    }).optional(),
    entities: z.array(IcdEntitySchema),
});

export const IcdConfigSchema = z.object({
    version: z.string(),
    icds: z.record(z.string(), IcdLayoutSchema),
});
