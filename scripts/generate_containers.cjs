const fs = require('fs');
const path = require('path');

// Read terminals data
const terminalsPath = path.join(__dirname, '../public/naqleen_terminals.json');
const terminalsData = JSON.parse(fs.readFileSync(terminalsPath, 'utf8'));

const terminal = terminalsData.terminals['naqleen-jeddah'];
const containers = [];

// Helper to get all blocks
function getAllBlocks(layout) {
    const blocks = [];
    const zones = layout.zones;
    
    if (zones.trs_container_blocks) {
        Object.values(zones.trs_container_blocks).forEach(block => {
            if (Array.isArray(block)) {
                block.forEach(b => blocks.push(b));
            } else {
                blocks.push(block);
            }
        });
    }
    if (zones.trm_container_blocks) {
        Object.values(zones.trm_container_blocks).forEach(block => {
             blocks.push(block);
        });
    }

    return blocks;
}

const blocks = getAllBlocks(terminal);

blocks.forEach(block => {
    const is20ft = block.container_type === '20ft';
    const containerLength = is20ft ? 6.058 : 12.192;
    const containerWidth = 2.438;
    const containerHeight = 2.591;
    const gapX = block.bay_gap || 0.5;
    const gapZ = 0.3;

    const bays = block.bays || 1;
    const rows = block.rows || 1;
    const tiers = 3;

    const totalWidth = bays * (containerLength + gapX);
    const totalDepth = rows * (containerWidth + gapZ);

    const startX = -totalWidth / 2 + containerLength / 2;
    const startZ = -totalDepth / 2 + containerWidth / 2;

    const blockPos = { x: block.position.x, y: block.position.y, z: block.position.z };
    const blockRot = block.rotation * Math.PI / 180;

    for (let b = 0; b < bays; b++) {
        for (let r = 0; r < rows; r++) {
            for (let t = 0; t < tiers; t++) {
                // 60% fill rate
                if (Math.random() > 0.4) {
                    // Gravity check
                    if (t > 0) {
                        const below = containers.find(c => c.blockId === block.id && c.bay === b && c.row === r && c.tier === t - 1);
                        if (!below) continue;
                    }

                    // Local position
                    const lx = startX + b * (containerLength + gapX);
                    const lz = startZ + r * (containerWidth + gapZ);
                    const ly = (t * containerHeight) + containerHeight / 2;

                    // Rotate
                    const cos = Math.cos(blockRot);
                    const sin = Math.sin(blockRot);
                    
                    const rx = lx * cos - lz * sin;
                    const rz = lx * sin + lz * cos;

                    // World position
                    const wx = rx + blockPos.x;
                    const wy = ly + blockPos.y; // Add block Y offset
                    const wz = rz + blockPos.z;

                    containers.push({
                        id: `${block.id}-b${b}-r${r}-t${t}`,
                        status: Math.random() > 0.9 ? 'maintenance' : Math.random() > 0.7 ? 'active' : 'inactive',
                        blockId: block.id,
                        bay: b,
                        row: r,
                        tier: t,
                        type: block.container_type || '20ft'
                    });
                }
            }
        }
    }
});

const outputPath = path.join(__dirname, '../public/containers.json');
fs.writeFileSync(outputPath, JSON.stringify(containers, null, 2));
console.log(`Generated ${containers.length} containers to ${outputPath}`);
