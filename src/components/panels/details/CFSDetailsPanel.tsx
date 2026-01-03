import React, { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useStore } from '../../../store/store';

export default function CFSDetailsPanel() {
    const selectedBlock = useStore(state => state.selectedBlock);
    const setSelectedBlock = useStore(state => state.setSelectedBlock);
    const layout = useStore(state => state.layout);

    // Local state for visibility animation
    const [isVisible, setIsVisible] = useState(false);

    // Identify if the selected block is a CFS Area
    const isCFSArea = selectedBlock?.startsWith('cfs_area');

    // Find CFS Area details from layout
    const cfsArea = React.useMemo(() => {
        if (!isCFSArea || !layout?.entities) return null;
        return layout.entities.find(e => e.id === selectedBlock);
    }, [isCFSArea, layout, selectedBlock]);

    useEffect(() => {
        if (isCFSArea && cfsArea) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [isCFSArea, cfsArea]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            setSelectedBlock(null);
        }, 300);
    };

    // Dummy containers data as requested
    const dummyContainers = [
        { id: 'TRLU4829105', type: '40ft Standard', status: 'Ready for Stuffing', color: '#00695C' },
        { id: 'MSKU9281743', type: '20ft Standard', status: 'Inspected', color: '#1A237E' },
        { id: 'CMAU1029384', type: '40ft High Cube', status: 'Customs Hold', color: '#C62828' },
        { id: 'HLBU5748392', type: '45ft Reefer', status: 'In Transit', color: '#F9A825' }
    ];

    if (!isCFSArea && !isVisible) return null;
    if (!cfsArea && !isVisible) return null;

    return (
        <div
            className={`cfs-details-panel ${isVisible ? 'visible' : ''}`}
            style={{
                position: 'fixed',
                top: '90px',
                right: '24px',
                width: '400px',
                maxHeight: 'calc(100vh - 114px)',
                backgroundColor: 'rgba(253, 246, 235, 0.95)', // Premium Cream
                backdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: '24px',
                border: '1px solid rgba(75, 104, 108, 0.1)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0,0,0,0.05)',
                zIndex: 1000,
                color: '#1e293b',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                transform: isVisible ? 'translateX(0)' : 'translateX(420px)',
                opacity: isVisible ? 1 : 0,
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '20px 24px 16px', // Reduced padding
                background: '#4B686C', // Primary Teal
                position: 'relative',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.9 }}>
                    <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <ShieldCheck size={12} color="white" />
                    </div>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 600, textTransform: 'uppercase' }}>
                        CFS Operations
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        margin: 0,
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '-0.5px'
                    }}>
                        {(cfsArea as any)?.name || 'CFS Area'}
                    </h2>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            transition: 'all 0.2s',
                            padding: 0
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', overflowY: 'auto' }} className="custom-scrollbar">

                {/* Container List Heading */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#444c56', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Assigned Containers
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                        {dummyContainers.length} units
                    </span>
                </div>

                {/* Container List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dummyContainers.map((container) => (
                        <div key={container.id} style={{
                            padding: '12px 16px',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'transform 0.2s',
                            cursor: 'default'
                        }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {/* Color Indicator */}
                            <div style={{ width: '4px', height: '32px', borderRadius: '4px', background: container.color }} />

                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{container.id}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{container.type}</div>
                            </div>

                            <div style={{
                                fontSize: '11px', fontWeight: 600,
                                padding: '4px 8px', borderRadius: '8px',
                                background: 'rgba(75, 104, 108, 0.1)', color: '#4B686C'
                            }}>
                                {container.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
