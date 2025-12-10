
import { useState } from 'react';
import PanelLayout from './PanelLayout';
import {
    Plus,
    Upload,
    Search,
    X,
    Package,
    FileSpreadsheet,
    Trash2,
    Edit2,
    Download,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

interface CustomerInventoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface InventoryItem {
    id: string;
    hsCode: string;
    qty: string;
    description: string;
    uom: string;
    grossWeight: string;
    netWeight?: string;
    weightUom?: string;
    volume: string;
    volumeUom?: string;
    unClass?: string;
    countryOfOrigin?: string;
}

interface InventoryRecord {
    id: string;
    customer: string;
    containerNumber: string;
    otmShipmentNumber: string;
    items: InventoryItem[];
}

export default function CustomerInventoryPanel({ isOpen, onClose }: CustomerInventoryPanelProps) {
    const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
    const [createMode, setCreateMode] = useState<'manual' | 'import'>('manual');
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [items, setItems] = useState<InventoryItem[]>([]);

    // View Inventory State
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // Form States
    const [customer, setCustomer] = useState('');
    const [terminal, setTerminal] = useState('');
    const [contact, setContact] = useState('');
    const [containerNumber, setContainerNumber] = useState('');
    const [otmShipmentNumber, setOtmShipmentNumber] = useState('');
    const [email, setEmail] = useState('');

    // Modal Form States
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({});

    // Mock Data for View Inventory with nested items
    const inventoryRecords: InventoryRecord[] = [
        {
            id: '1',
            customer: 'MSC',
            containerNumber: 'ABCD1234567',
            otmShipmentNumber: '20251014-0001',
            items: Array.from({ length: 20 }).map((_, i) => ({
                id: `10${i}`,
                hsCode: `8421.99.${(i + 10).toString().padStart(4, '0')}`,
                qty: `${(i + 1) * 50}`,
                uom: 'PCS',
                volume: `${(i + 1) * 0.5}`,
                description: `SPARE PART TYPE ${String.fromCharCode(65 + i)} - HEAVY DUTY`,
                grossWeight: `${(i + 1) * 10}`
            }))
        },
        {
            id: '2',
            customer: 'MAERSK',
            containerNumber: 'EFGH7654321',
            otmShipmentNumber: '20251014-0002',
            items: Array.from({ length: 15 }).map((_, i) => ({
                id: `20${i}`,
                hsCode: `7308.30.${(i + 10).toString().padStart(4, '0')}`,
                qty: `${(i + 1) * 10}`,
                uom: 'UNITS',
                volume: `${(i + 1) * 1.2}`,
                description: `STRUCTURAL COMPONENT ${i + 1}`,
                grossWeight: `${(i + 1) * 50}`
            }))
        },
        {
            id: '3',
            customer: 'CMA CGM',
            containerNumber: 'XYZA9876543',
            otmShipmentNumber: '20251014-0003',
            items: [
                { id: '301', hsCode: '8501.10.0000', qty: '200', uom: 'PCS', volume: '8', description: 'ELECTRIC MOTORS', grossWeight: '800' },
                { id: '302', hsCode: '8544.42.00', qty: '1000', uom: 'M', volume: '5', description: 'INSULATED WIRE', grossWeight: '300' }
            ]
        },
        {
            id: '4',
            customer: 'MSC',
            containerNumber: 'MSCU1234567',
            otmShipmentNumber: '20251014-0004',
            items: [
                { id: '401', hsCode: '8421.99.0140', qty: '50', uom: 'PCS', volume: '6', description: 'SPARE PARTS', grossWeight: '250' }
            ]
        },
    ];

    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        color: 'var(--text-color)',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s',
        boxSizing: 'border-box' as const
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b',
        letterSpacing: '0.02em',
        fontFamily: 'inherit'
    };

    const sectionTitleStyle = {
        fontSize: '15px',
        fontWeight: 700,
        color: 'var(--text-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid #f1f5f9'
    };

    const modalOverlayStyle = {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    };

    const modalStyle = {
        background: 'var(--card-bg)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    };

    const handleAddItem = () => {
        if (!newItem.hsCode || !newItem.qty) return;

        // Validation for non-negative values
        const qty = parseFloat(newItem.qty);
        const weight = parseFloat(newItem.grossWeight || '0');
        const volume = parseFloat(newItem.volume || '0');

        if (qty < 0 || weight < 0 || volume < 0) {
            alert("Quantity, Weight, and Volume cannot be negative.");
            return;
        }

        setItems([...items, {
            ...newItem,
            id: Date.now().toString(),
            weightUom: newItem.weightUom || 'KGM',
            volumeUom: newItem.volumeUom || 'M3'
        } as InventoryItem]);
        setNewItem({});
        setShowAddItemModal(false);
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const toggleRow = (id: string) => {
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    return (
        <>
            <PanelLayout
                title="Customer Inventory"
                isOpen={isOpen}
                onClose={onClose}
                width="950px"
            >
                {/* Main Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
                    {['create', 'view'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                                padding: '12px 16px',
                                fontSize: '14px',
                                fontWeight: activeTab === tab ? 600 : 500,
                                color: activeTab === tab ? 'var(--primary-color)' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textTransform: 'capitalize',
                                boxShadow: 'none'
                            }}
                        >
                            {tab === 'create' ? 'Create Inventory' : 'View Inventory'}
                        </button>
                    ))}
                </div>

                {activeTab === 'create' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Entry Method Toggle */}
                        <div style={{ display: 'flex', gap: '8px', padding: '4px', background: '#f1f5f9', borderRadius: '12px', width: 'fit-content' }}>
                            <button
                                onClick={() => setCreateMode('manual')}
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: createMode === 'manual' ? 'white' : 'transparent',
                                    boxShadow: createMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    color: createMode === 'manual' ? 'var(--primary-color)' : '#64748b',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Edit2 size={14} /> Manual Entry
                            </button>
                            <button
                                onClick={() => setCreateMode('import')}
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: createMode === 'import' ? 'white' : 'transparent',
                                    boxShadow: createMode === 'import' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    color: createMode === 'import' ? 'var(--primary-color)' : '#64748b',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <FileSpreadsheet size={14} /> Bulk Import
                            </button>
                        </div>

                        {createMode === 'import' ? (
                            <div style={{
                                border: '2px dashed #cbd5e1',
                                borderRadius: '16px',
                                padding: '48px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                background: '#f8fafc'
                            }}>
                                <div style={{ padding: '16px', background: '#e2e8f0', borderRadius: '50%' }}>
                                    <Upload size={32} color="#64748b" />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-color)' }}>Click or drag file to upload</h4>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Support for Excel (.xlsx) files</p>
                                </div>
                                <button style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: 'var(--primary-color)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    boxShadow: 'none'
                                }}>
                                    <Download size={14} /> Download Template
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    {/* Column 1: Core Details */}
                                    <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={sectionTitleStyle}>
                                            <Package size={16} color="var(--primary-color)" /> Shipment Details
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <label style={labelStyle}>Customer / Liner <span style={{ color: 'red' }}>*</span></label>
                                                <input type="text" style={inputStyle} value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. MSC" />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={labelStyle}>Terminal <span style={{ color: 'red' }}>*</span></label>
                                                    <input type="text" style={inputStyle} value={terminal} onChange={e => setTerminal(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Shipment Number <span style={{ color: 'red' }}>*</span></label>
                                                    <input type="text" style={inputStyle} value={otmShipmentNumber} onChange={e => setOtmShipmentNumber(e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Contact Person</label>
                                                <input type="text" style={inputStyle} value={contact} onChange={e => setContact(e.target.value)} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Email Address</label>
                                                <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Container & Summary */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                            <div style={sectionTitleStyle}>
                                                <Package size={16} color="var(--primary-color)" /> Container Details
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Container Number <span style={{ color: 'red' }}>*</span></label>
                                                <input type="text" style={inputStyle} value={containerNumber} onChange={e => setContainerNumber(e.target.value)} placeholder="ABCD1234567" />
                                            </div>
                                        </div>

                                        {/* Items Summary Card */}
                                        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ ...sectionTitleStyle, justifyContent: 'space-between', borderBottom: 'none', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Package size={16} color="var(--primary-color)" /> Items ({items.length})
                                                </div>
                                                <button
                                                    onClick={() => setShowAddItemModal(true)}
                                                    style={{
                                                        background: 'var(--primary-color)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Plus size={12} /> Add Item
                                                </button>
                                            </div>

                                            {/* Items List */}
                                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {items.length === 0 ? (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '1px dashed #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                                        No items added yet.
                                                    </div>
                                                ) : (
                                                    items.map(item => (
                                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)' }}>HS: {item.hsCode}</div>
                                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Qty: {item.qty} {item.uom}</div>
                                                            </div>
                                                            <button onClick={() => handleDeleteItem(item.id)} style={{ padding: '6px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, boxShadow: 'none' }}><Trash2 size={14} /></button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                    <button style={{
                                        padding: '12px 32px',
                                        background: 'var(--primary-gradient)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(75, 104, 108, 0.3)'
                                    }}>
                                        Create Inventory
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'view' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                        {/* Search Bar */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    placeholder="Search inventory..."
                                    style={{ ...inputStyle, paddingLeft: '38px', background: 'white', borderColor: '#e2e8f0' }}
                                />
                            </div>
                            <div style={{
                                padding: '10px 16px',
                                background: 'white',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--primary-color)',
                                border: '1px solid #e2e8f0',
                                whiteSpace: 'nowrap'
                            }}>
                                {inventoryRecords.length} Records
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: 'white', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Table Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '16px' }}>
                                <div></div>
                                <div style={{ fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Customer</div>
                                <div style={{ fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Container</div>
                                <div style={{ fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Shipment Number</div>
                                <div style={{ fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Items</div>
                            </div>

                            {/* Table Body */}
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {inventoryRecords.map((record) => (
                                    <div key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        {/* Main Row */}
                                        <div
                                            onClick={() => toggleRow(record.id)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '40px 1.5fr 1.5fr 1fr 1fr',
                                                padding: '16px',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                background: expandedRowId === record.id ? '#f1f5f9' : 'white',
                                                transition: 'background 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {expandedRowId === record.id ? <ChevronDown size={14} color="var(--primary-color)" /> : <ChevronRight size={14} color="#94a3b8" />}
                                            </div>
                                            <div style={{ fontWeight: 500, color: 'var(--text-color)' }}>{record.customer}</div>
                                            <div style={{ color: '#334155', fontFamily: 'monospace', fontWeight: 500 }}>{record.containerNumber}</div>
                                            <div style={{ color: '#64748b' }}>{record.otmShipmentNumber}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{
                                                    background: 'var(--secondary-color)',
                                                    color: '#7c2d12',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '12px'
                                                }}>
                                                    {record.items.length}
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>items</span>
                                            </div>
                                        </div>

                                        {/* Expanded Row Details */}
                                        {expandedRowId === record.id && (
                                            <div style={{ background: '#f8fafc', padding: '16px 16px 16px 56px', borderTop: '1px solid #e2e8f0' }}>
                                                <div style={{
                                                    background: 'white',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    overflow: 'hidden',
                                                    maxHeight: '400px',
                                                    overflowY: 'auto'
                                                }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--primary-color)', fontSize: '11px', textTransform: 'uppercase' }}>HS Code</th>
                                                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--primary-color)', fontSize: '11px', textTransform: 'uppercase' }}>Description</th>
                                                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--primary-color)', fontSize: '11px', textTransform: 'uppercase' }}>Qty</th>
                                                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--primary-color)', fontSize: '11px', textTransform: 'uppercase' }}>Weight</th>
                                                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--primary-color)', fontSize: '11px', textTransform: 'uppercase' }}>Volume</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {record.items.map(item => (
                                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                    <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace' }}>{item.hsCode}</td>
                                                                    <td style={{ padding: '10px 16px', color: 'var(--text-color)', fontWeight: 500 }}>{item.description}</td>
                                                                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{item.qty} {item.uom}</td>
                                                                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{item.grossWeight} {item.weightUom || 'KGM'}</td>
                                                                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{item.volume} {item.volumeUom || 'M3'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </PanelLayout>

            {/* Add Item Modal */}
            {showAddItemModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalStyle}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-color)' }}>Add New Item</h3>
                            <button onClick={() => setShowAddItemModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', boxShadow: 'none' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '32px', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                {/* Classification */}
                                <div style={{ gridColumn: '1 / -1', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Classification</div>
                                <div>
                                    <label style={labelStyle}>HS Code <span style={{ color: 'red' }}>*</span></label>
                                    <input type="text" style={inputStyle} value={newItem.hsCode || ''} onChange={e => setNewItem({ ...newItem, hsCode: e.target.value })} placeholder="8421.99.00" />
                                </div>
                                <div>
                                    <label style={labelStyle}>UN Class</label>
                                    <input type="text" style={inputStyle} value={newItem.unClass || ''} onChange={e => setNewItem({ ...newItem, unClass: e.target.value })} />
                                </div>

                                {/* Measurements */}
                                <div style={{ gridColumn: '1 / -1', margin: '8px 0', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Measurements</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Qty <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            type="number"
                                            min="0"
                                            style={inputStyle}
                                            value={newItem.qty || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (parseFloat(val) < 0) return;
                                                setNewItem({ ...newItem, qty: val })
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>UOM</label>
                                        <input type="text" style={inputStyle} value={newItem.uom || ''} onChange={e => setNewItem({ ...newItem, uom: e.target.value })} placeholder="PCS" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Gross Weight</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                                        <input type="number" min="0" style={inputStyle} value={newItem.grossWeight || ''} onChange={e => setNewItem({ ...newItem, grossWeight: e.target.value })} />
                                        <input type="text" style={inputStyle} value={newItem.weightUom || 'KGM'} onChange={e => setNewItem({ ...newItem, weightUom: e.target.value })} placeholder="KGM" />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Volume</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                                        <input type="number" min="0" style={inputStyle} value={newItem.volume || ''} onChange={e => setNewItem({ ...newItem, volume: e.target.value })} />
                                        <input type="text" style={inputStyle} value={newItem.volumeUom || 'M3'} onChange={e => setNewItem({ ...newItem, volumeUom: e.target.value })} placeholder="M3" />
                                    </div>
                                </div>

                                {/* Details */}
                                <div style={{ gridColumn: '1 / -1', margin: '8px 0', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Item Details</div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Description</label>
                                    <input type="text" style={inputStyle} value={newItem.description || ''} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Country of Origin</label>
                                    <input type="text" style={inputStyle} value={newItem.countryOfOrigin || ''} onChange={e => setNewItem({ ...newItem, countryOfOrigin: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setShowAddItemModal(false)} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', fontWeight: 600, color: '#64748b', cursor: 'pointer', boxShadow: 'none' }}>Cancel</button>
                            <button onClick={handleAddItem} style={{ padding: '10px 24px', background: 'var(--primary-color)', border: 'none', borderRadius: '8px', fontWeight: 600, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Add Item</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
