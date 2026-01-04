import { z } from 'zod';
import { IcdLayoutSchema as LayoutSchemaZod } from '../types/IcdSchema.zod';
import type { IcdLayoutSchema } from '../types/IcdSchema';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export const validateLayout = (data: unknown): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Zod Schema Validation (Structure & Types)
    const result = LayoutSchemaZod.safeParse(data);

    if (!result.success) {
        // Format Zod errors nicely
        result.error.errors.forEach((err) => {
            const path = err.path.join('.');
            errors.push(`[Schema Error] ${path}: ${err.message}`);
        });
        return { isValid: false, errors, warnings };
    }

    const layout = result.data; // Strongly typed after safeParse

    // 2. Logical Validation (Business Rules)
    const entityIds = new Set<string>();

    // Check for Duplicate IDs
    layout.entities.forEach(entity => {
        if (entityIds.has(entity.id)) {
            errors.push(`[Logic Error] Duplicate Entity ID: '${entity.id}'`);
        }
        entityIds.add(entity.id);
    });

    // Check Placement References
    layout.entities.forEach(entity => {
        if (entity.placement?.relative_to) {
            const targetId = entity.placement.relative_to;
            if (!entityIds.has(targetId)) {
                errors.push(`[Logic Error] Entity '${entity.id}' references non-existent relative_to ID: '${targetId}'`);
            }
            if (targetId === entity.id) {
                errors.push(`[Logic Error] Entity '${entity.id}' cannot be relative to itself.`);
            }
        }
    });

    // Circular Dependency Check
    const checkCircular = (currentId: string, visited: Set<string>, depth: number): boolean => {
        if (depth > 20) return true;
        const entity = layout.entities.find(e => e.id === currentId);
        if (!entity || !entity.placement?.relative_to) return false;

        const parentId = entity.placement.relative_to;
        if (visited.has(parentId)) return true;

        visited.add(parentId);
        return checkCircular(parentId, visited, depth + 1);
    };

    layout.entities.forEach(entity => {
        if (entity.placement?.relative_to) {
            if (checkCircular(entity.id, new Set([entity.id]), 0)) {
                errors.push(`[Logic Error] Circular dependency detected starting at entity '${entity.id}'`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};
