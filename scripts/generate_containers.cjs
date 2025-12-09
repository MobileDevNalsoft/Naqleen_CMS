const fs = require('fs');
const path = require('path');

// Read icds data
const icdsPath = path.join(__dirname, '../public/naqleen_icds.json');
const icdsData = JSON.parse(fs.readFileSync(icdsPath, 'utf8'));

const icd = icdsData.icds['naqleen-jeddah'];
const containers = [];

// Helper to get all blocks
function getAllBlocks(layout) {
    const blocks = [];
    const terminals = layout.terminals;
    
    if (terminals.trs_container_blocks) {
        Object.values(terminals.trs_container_blocks).forEach(block => {
            if (Array.isArray(block)) {
                block.forEach(b => blocks.push(b));
            } else {
                blocks.push(block);
            }
        });
    }
    if (terminals.trm_container_blocks) {
        Object.values(terminals.trm_container_blocks).forEach(block => {
             blocks.push(block);
        });
    }

    return blocks;
}

const blocks = getAllBlocks(icd);

blocks.forEach(block => {
    const is20ft = block.container_type === '20ft';
    const containerLength = is20ft ? 6.058 : 12.192;
    const containerWidth = 2.438;
    const containerHeight = 2.591;
    const gapX = block.lot_gap || 0.5;
    const gapZ = 0.3;

    const lots = block.lots || 1;
    const rows = block.rows || 1;
    const levels = 6;

    const totalWidth = lots * (containerLength + gapX);
    const totalDepth = rows * (containerWidth + gapZ);

    const startX = -totalWidth / 2 + containerLength / 2;
    const startZ = -totalDepth / 2 + containerWidth / 2;

    const blockPos = { x: block.position.x, y: block.position.y, z: block.position.z };
    const blockRot = block.rotation * Math.PI / 180;

    for (let b = 0; b < lots; b++) {
        for (let r = 0; r < rows; r++) {
            for (let t = 0; t < levels; t++) {
                // 60% fill rate
                if (Math.random() > 0.4) {
                    // Gravity check
                    if (t > 0) {
                        const below = containers.find(c => c.blockId === block.id && c.lot === b && c.row === r && c.level === t - 1);
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

                    // Extract terminal type and block letter from block ID
                    const terminalType = block.id.includes('trs') ? 'trs' : 'trm';
                    const blockLetter = block.id.match(/_([a-d])$/)?.[1] || 'a';
                    
                    // Convert to new naming convention
                    const rowLetter = String.fromCharCode(97 + r); // a, b, c...
                    const lotLetter = String.fromCharCode(97 + b); // a, b, c...
                    const levelNumber = t + 1; // 1-6
                    
                    containers.push({
                        id: `${terminalType}_block_${blockLetter}_r${r + 1}_b${lotLetter}_l${levelNumber}`,
                        status: Math.random() > 0.9 ? 'maintenance' : Math.random() > 0.7 ? 'active' : 'inactive',
                        blockId: block.id,
                        lot: b,
                        row: r,
                        level: t,
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
