import { useState } from 'react';
import PanelLayout from './PanelLayout';
import { Box, Lock, User, Plus, Trash2 } from 'lucide-react';

interface StuffingPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Item {
    id: number;
    description: string;
    quantity: number;
}

export default function StuffingPanel({ isOpen, onClose }: StuffingPanelProps) {
    const [containerNumber, setContainerNumber] = useState('');
    const [sealNumber, setSealNumber] = useState('');
    const [customer, setCustomer] = useState('');
    const [items, setItems] = useState<Item[]>([]);
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState('');

    const handleAddItem = () => {
        if (newItemDesc && newItemQty) {
            setItems([...items, {
                id: Date.now(),
                description: newItemDesc,
                quantity: parseInt(newItemQty) || 0
            }]);
            setNewItemDesc('');
            setNewItemQty('');
        }
    };

    const handleRemoveItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleStuffing = () => {
        console.log('Stuffing Assigned:', { containerNumber, sealNumber, customer, items });
        onClose();
    };



    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };

    return (
        <PanelLayout
            title="Assign Stuffing"
            category="YARD OPERATION"
            isOpen={isOpen}
            onClose={onClose}
            width="450px"
            footerActions={
                <>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStuffing}
                        style={{
                            padding: '10px 24px',
                            background: 'var(--secondary-gradient)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'var(--primary-color)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(247, 207, 155, 0.3)',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(247, 207, 155, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(247, 207, 155, 0.3)';
                        }}
                    >
                        Assign Stuffing
                    </button>
                </>
            }
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                    <label style={labelStyle}>Container No</label>
                    <div style={{ position: 'relative' }}>
                        <Box size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                        <input
                            type="text"
                            placeholder="ABCD1234567"
                            value={containerNumber}
                            onChange={(e) => setContainerNumber(e.target.value)}
                            className="modern-input"
                            style={{ paddingLeft: '48px' }} />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Seal No</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                        <input
                            type="text"
                            placeholder="Seal Number"
                            value={sealNumber}
                            onChange={(e) => setSealNumber(e.target.value)}
                            className="modern-input"
                            style={{ paddingLeft: '48px' }} />
                    </div>
                </div>
            </div>

            <div>
                <label style={labelStyle}>Customer / Liner</label>
                <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B686C' }} />
                    <input
                        type="text"
                        placeholder="Select Customer"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        className="modern-input"
                        style={{ paddingLeft: '48px' }} />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Items List</label>
                <div style={{
                    background: 'rgba(0, 0, 0, 0.03)',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                }}>
                    {/* Add Item Row */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                            type="text"
                            placeholder="Item Description"
                            value={newItemDesc}
                            onChange={(e) => setNewItemDesc(e.target.value)}
                            className="modern-input"
                            style={{ flex: 2 }}
                        />
                        <input
                            type="number"
                            placeholder="Qty"
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(e.target.value)}
                            className="modern-input"
                            style={{ flex: 1 }}
                        />
                        <button
                            onClick={handleAddItem}
                            style={{
                                background: 'rgba(75, 104, 108, 0.1)',
                                border: 'none',
                                borderRadius: '12px',
                                width: '42px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#4B686C'
                            }}
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                        {items.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '10px' }}>
                                No items added yet
                            </div>
                        )}
                        {items.map(item => (
                            <div key={item.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: 'white',
                                borderRadius: '8px',
                                border: '1px solid rgba(0, 0, 0, 0.05)'
                            }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ color: '#4B686C', fontWeight: 600, fontSize: '13px' }}>{item.quantity}x</span>
                                    <span style={{ color: '#1e293b', fontSize: '13px' }}>{item.description}</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'rgba(239, 68, 68, 0.7)',
                                        padding: '4px'
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PanelLayout>
    );
}
