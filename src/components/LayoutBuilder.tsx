import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/store';

interface ZoneData {
    id: string;
    type: string;
    dimensions: { width: number; height: number };
    position: { x: number; y: number; z: number };
    rotation: number;
    corner_points?: Array<{ x: number; z: number; description?: string }>;
}

interface BlockData extends ZoneData {
    bays: number;
    rows: number;
    row_labels?: string[];
    bay_numbers?: number[];
    container_type: string;
}

// Zone colors
const ZONE_COLORS: Record<string, { color: string; opacity: number }> = {
    container_block_a: { color: '#FF9800', opacity: 0.4 },
    container_block_b: { color: '#F44336', opacity: 0.4 },
    container_block_c: { color: '#9C27B0', opacity: 0.4 },
    container_block_d: { color: '#607D8B', opacity: 0.4 },
    road: { color: '#000000', opacity: 0.1 },
    access: { color: '#8BC34A', opacity: 0.3 },
    customhouse: { color: '#795548', opacity: 0.5 },
    toplift: { color: '#FFC107', opacity: 0.6 },
    yard_base: { color: '#393838', opacity: 1.0 },
};

const Zone: React.FC<{ zone: ZoneData }> = ({ zone }) => {
    // Skip rendering TRS and TRM zones
    if (zone.type === 'trs_zone' || zone.type === 'trm_zone') {
        return null;
    }

    const config = ZONE_COLORS[zone.type] || { color: '#9E9E9E', opacity: 0.3 };
    const isYardBase = zone.type === 'yard_base';

    const geometry = useMemo(() => {
        if (zone.corner_points) {
            const shape = new THREE.Shape();
            const points = zone.corner_points;

            if (points.length > 0) {
                shape.moveTo(points[0].x - zone.position.x, points[0].z - zone.position.z);
                for (let i = 1; i < points.length; i++) {
                    shape.lineTo(points[i].x - zone.position.x, points[i].z - zone.position.z);
                }
                shape.lineTo(points[0].x - zone.position.x, points[0].z - zone.position.z);
            }

            return new THREE.ShapeGeometry(shape);
        } else {
            return new THREE.PlaneGeometry(zone.dimensions.width, zone.dimensions.height);
        }
    }, [zone]);

    return (
        <mesh
            position={[zone.position.x, zone.position.y, zone.position.z]}
            rotation={[-Math.PI / 2, zone.rotation || 0, 0]}
            receiveShadow={isYardBase}
        >
            <primitive object={geometry} />
            <meshStandardMaterial
                color={config.color}
                transparent={true}
                opacity={config.opacity}
                side={THREE.DoubleSide}
                roughness={0.9}
                metalness={0.1}
            />
        </mesh>
    );
};

const LayoutBuilder: React.FC = () => {
    const layoutData = useStore((state) => state.layout);

    const zones = useMemo(() => {
        if (!layoutData) return { zones: [], blocks: [] };

        const allZones: ZoneData[] = [];
        const blocks: BlockData[] = [];

        // Flatten zones from all categories
        const flattenZones = (obj: any) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => flattenZones(item));
            } else if (obj && typeof obj === 'object') {
                if ((obj.dimensions && obj.position) || (obj.type === 'yard_base' && obj.corner_points && obj.position)) {
                    if (obj.bays && obj.rows) {
                        blocks.push(obj);
                    } else {
                        allZones.push(obj);
                    }
                } else {
                    Object.values(obj).forEach(flattenZones);
                }
            }
        };

        flattenZones(layoutData.zones);

        return { zones: allZones, blocks };
    }, [layoutData]);

    if (!layoutData) return null;

    return (
        <group>
            {/* Render zones */}
            {zones.zones.map((zone) => (
                <Zone key={zone.id} zone={zone} />
            ))}
        </group>
    );
};

export default LayoutBuilder;
