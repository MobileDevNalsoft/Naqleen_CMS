
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    ChevronRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    AlertTriangle
} from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import { fetchInventory, createInventory, createBulkInventory, fetchCustomerLookup, fetchShipmentLookup } from '../../api/inventory';
import { parseInventoryExcel } from '../../services/excelImportService';
import type { InventoryRecord, InventoryItem, InventoryPayloadItem } from '../../api/inventory';

interface CustomerInventoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Removed local interfaces in favor of API interfaces
// interface InventoryItem ...
// interface InventoryRecord ...

export default function CustomerInventoryPanel({ isOpen, onClose }: CustomerInventoryPanelProps) {
    const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
    const [createMode, setCreateMode] = useState<'manual' | 'import'>('manual');
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [items, setItems] = useState<InventoryItem[]>([]);

    // API Data State
    const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Import State
    const [isImporting, setIsImporting] = useState(false);
    // Removed unused importFile state
    const [importedItems, setImportedItems] = useState<InventoryPayloadItem[]>([]);

    // Bulk Conflict State
    const [showBulkConflictModal, setShowBulkConflictModal] = useState(false);
    const [conflictDetails, setConflictDetails] = useState<any>(null); // Store server response for conflicts

    // View Inventory State
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

    // Form States
    const [customer, setCustomer] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(''); // Payload needs Name, Lookup needs ID
    const [terminal, setTerminal] = useState('');
    const [contact, setContact] = useState('');
    const [containerNumber, setContainerNumber] = useState('');
    const [otmShipmentNumber, setOtmShipmentNumber] = useState('');
    const [email, setEmail] = useState('');

    // Mock Options - Customers replaced by API lookup
    const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string; original?: any }[]>([]);
    const [shipmentOptions, setShipmentOptions] = useState<{ label: string; value: string }[]>([]);
    const terminals = ['Naqleen Jeddah'];
    // Shipment numbers replaced by API lookup

    // New state to store raw customer and shipment data
    const [customersData, setCustomersData] = useState<any[]>([]);
    const [shipmentsData, setShipmentsData] = useState<any[]>([]); // Store shipment objects
    const [isContainerReadOnly, setIsContainerReadOnly] = useState(false);

    const handleCustomerSearch = async (query: string) => {
        console.log("Searching for:", query);
        // Allow empty query for initial load
        try {
            const data = await fetchCustomerLookup(query);
            console.log("Customer Lookup API Response:", data);

            // "data" is { customer_nbr, customer_name }
            // Use Name as value but store full object to lookup ID for shipments
            const options = data.map(c => ({ label: c.customer_name, value: c.customer_name, original: c }));
            console.log("Mapped Options:", options);
            setCustomerOptions(options);
            setCustomersData(data);
        } catch (error) {
            console.error("Error searching customers:", error);
        }
    };

    const handleShipmentSearch = async (query: string) => {
        if (!customer) return;

        // Find customer ID
        // We look in customersData. But customersData might only have search results.
        // If user selected a customer, and then searched something else, customersData changes.
        // We need to ensure we have the ID of the *selected* customer.
        // When user selects a customer, we should store the ID.
        // Let's add state selectedCustomerId.
        const selectedId = selectedCustomerId; // Need to add this state
        if (!selectedId) {
            console.warn("No customer ID found for shipment search");
            return;
        }

        console.log("Searching shipments for Customer ID:", selectedId, "Query:", query);
        try {
            const data = await fetchShipmentLookup(selectedId, query);

            // "data" is [{ shipment_nbr: string, container_nbr?: string }]
            const options = data.map(s => ({ label: s.shipment_nbr, value: s.shipment_nbr }));
            setShipmentOptions(options);
            setShipmentsData(data);
        } catch (error) {
            console.error("Error searching shipments:", error);
        }
    };

    // Load initial customer options
    useEffect(() => {
        if (activeTab === 'create' && createMode === 'manual') {
            handleCustomerSearch('');
        }
    }, [activeTab, createMode]);

    // Modal Form States
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({});

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // View Inventory - Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchFilter, setSearchFilter] = useState<'SHIPMENT' | 'CUSTOMER' | 'CONTAINER'>('CUSTOMER');

    // Load inventory on mount and tab change
    useEffect(() => {
        if (activeTab === 'view' && isOpen) {
            loadInventory();
        }
    }, [activeTab, isOpen]);

    const loadInventory = async (term: string = searchTerm, filter: string = searchFilter) => {
        setIsLoadingInventory(true);
        try {
            const params: { searchCust?: string; searchCont?: string; searchShip?: string } = {};

            if (term) {
                if (filter === 'CUSTOMER') {
                    params.searchCust = term;
                } else if (filter === 'CONTAINER') {
                    params.searchCont = term;
                } else if (filter === 'SHIPMENT') {
                    params.searchShip = term;
                }
            }

            const data = await fetchInventory(params);
            console.log("CustomerInventoryPanel loaded:", data);
            setInventoryRecords(data);
        } catch (error) {
            console.error("Failed to load inventory:", error);
            showNotification("Failed to load inventory", 'error');
        } finally {
            setIsLoadingInventory(false);
        }
    };



    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [duplicateMessage, setDuplicateMessage] = useState<string>('');
    const [pendingRecord, setPendingRecord] = useState<Omit<InventoryRecord, 'id'> | null>(null);

    // ... existing showNotification and loadInventory ...

    // ...

    const handleCreateInventory = async () => {
        if (!customer || !terminal || !otmShipmentNumber || !containerNumber) {
            showNotification("Please fill in all required fields.", 'warning');
            return;
        }

        if (items.length === 0) {
            showNotification("Please add at least one item.", 'warning');
            return;
        }

        setIsSubmitting(true);
        const newRecord = {
            customer,
            containerNumber,
            otmShipmentNumber,
            items
        };

        try {
            // Step 1: Check/Create with flag='CHECK'
            await createInventory(newRecord, 'CHECK');

            // Step 2: If 200, it's done (as per user instruction)
            // Assuming response contains status or we check for success some other way.
            // But typical REST: 200 is success. If createInventory throws on non-200, we catch below.
            // If createInventory returns data, it means 200 OK.

            showNotification("Inventory created successfully!", 'success');
            resetForm();
            setTimeout(() => setActiveTab('view'), 1000);

        } catch (error: any) {
            console.error("Creation check failed:", error);
            // Step 3: Conflict handling
            // If it's a conflict/duplicate, backend should return details.
            // We assume error object has the info.
            if (error.response_code !== 200 && error.response_message) {
                setDuplicateMessage(error.response_message || "Records already exist.");
                setPendingRecord(newRecord);
                setShowConfirmModal(true);
            } else {
                showNotification("Failed to create inventory. Please try again.", 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmInsert = async () => {
        if (!pendingRecord) return;

        setIsSubmitting(true);
        try {
            // Step 4: Force Insert with flag='INSERT'
            await createInventory(pendingRecord, 'INSERT');
            showNotification("Inventory forcibly created!", 'success');
            resetForm();
            setShowConfirmModal(false);
            setPendingRecord(null);
            setTimeout(() => setActiveTab('view'), 1000);
        } catch (error) {
            console.error("Force insert failed:", error);
            showNotification("Failed to create inventory even with force insert.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setCustomer('');
        setTerminal('');
        setOtmShipmentNumber('');
        setContact('');
        setEmail('');
        setContainerNumber('');
        setItems([]);
    };

    // --- Import Handler ---
    const handleFileUpload = async (event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file) return;

        setIsImporting(true);

        try {
            const parsedItems = await parseInventoryExcel(file);
            console.log("Parsed Items:", parsedItems);

            if (parsedItems.length === 0) {
                showNotification("No valid inventory items found in file.", 'warning');
                return;
            }

            // Preview Check
            setImportedItems(parsedItems);

            // Using INSERT flag for bulk import - wait, we want preview first.
            // await createBulkInventory(parsedItems, 'INSERT');  <-- Removed
            // showNotification(`Successfully imported ${parsedItems.length} items!`, 'success'); <-- Removed

        } catch (error: any) {
            console.error("Import failed:", error);
            showNotification(error.message || "Failed to import file.", 'error');
            setImportedItems([]);
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    // --- Import Action Handlers ---
    const handleCancelImport = () => {
        setImportedItems([]);
        setShowBulkConflictModal(false);
        setConflictDetails(null);
    };

    const handleConfirmImport = async () => {
        setIsSubmitting(true);
        try {
            const checkResponse = await createBulkInventory(importedItems, 'CHECK');
            if (checkResponse.response_code === 500 && checkResponse.response_message === 'Duplicate records found' && Array.isArray(checkResponse.data)) {
                setConflictDetails({ conflicts: checkResponse.data });
                setShowBulkConflictModal(true);
                return;
            }
            showNotification(`Successfully imported ${importedItems.length} items!`, 'success');
            handleCancelImport(); // Clear state
            loadInventory();
            setTimeout(() => setActiveTab('view'), 500);

        } catch (error: any) {
            console.error("Conflict Check Failed:", error);

            if (error.response_code === 500 && error.response_message === 'Duplicate records found' && Array.isArray(error.data)) {
                setConflictDetails({ conflicts: error.data });
                setShowBulkConflictModal(true);
                return;
            }

            // Fallback for other duplicate indications or generic errors
            if (error.status === 'error' && error.conflicts) {
                setConflictDetails(error);
                setShowBulkConflictModal(true);
            } else if (error.message?.includes('duplicate')) {
                setConflictDetails({ conflicts: [], message: error.message }); // No specific list?
                setShowBulkConflictModal(true);
            } else {
                showNotification(error.response_message || error.message || "Failed to validate import.", 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForceImport = async () => {
        setIsSubmitting(true);
        try {
            await createBulkInventory(importedItems, 'INSERT');
            showNotification(`Successfully imported ${importedItems.length} items (Forced)!`, 'success');
            handleCancelImport();
            loadInventory();
            setTimeout(() => setActiveTab('view'), 500);
        } catch (error: any) {
            console.error("Force Import Failed:", error);
            showNotification(error.message || "Failed to force import.", 'error');
        } finally {
            setIsSubmitting(false);
            setShowBulkConflictModal(false);
        }
    };
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
        if (!newItem.hsCode || !newItem.qty) {
            showNotification("Please enter HS Code and Quantity.", 'warning');
            return;
        }

        // Validation for non-negative values
        const qty = parseFloat(newItem.qty || '0');
        const weight = parseFloat(newItem.grossWeight || '0');
        const volume = parseFloat(newItem.volume || '0');

        if (qty < 0 || weight < 0 || volume < 0) {
            showNotification("Quantity, Weight, and Volume cannot be negative.", 'warning');
            return;
        }

        setItems([...items, {
            id: Date.now().toString(),
            hsCode: newItem.hsCode || '',
            qty: newItem.qty || '0',
            description: newItem.description || '',
            uom: newItem.uom || 'PCS',
            grossWeight: newItem.grossWeight || '0',
            weightUom: newItem.weightUom || 'KGM',
            volume: newItem.volume || '0',
            volumeUom: newItem.volumeUom || 'M3',
            unClass: newItem.unClass,
            countryOfOrigin: newItem.countryOfOrigin
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
            {/* Confirmation Modal */}
            {showConfirmModal && createPortal(
                <div style={modalOverlayStyle} onClick={() => setShowConfirmModal(false)}>
                    <div style={{ ...modalStyle, maxWidth: '500px', height: 'auto', maxHeight: 'none' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <AlertCircle size={24} color="#ef4444" />
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-color)' }}>Duplicate Records Options</h3>
                            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                                {duplicateMessage}
                                <br />
                                Do you want to proceed with inserting these records anyway?
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: 'white',
                                        color: '#64748b',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmInsert}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Proceed to Insert
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <PanelLayout
                title="Customer Inventory"
                isOpen={isOpen}
                onClose={onClose}
                width="950px"
                headerActions={notification && (
                    <div style={{
                        background: notification.type === 'success' ? '#f0fdf4' : notification.type === 'error' ? '#fef2f2' : '#fffbeb',
                        border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : notification.type === 'error' ? '#fecaca' : '#fde68a'}`,
                        color: notification.type === 'success' ? '#166534' : notification.type === 'error' ? '#991b1b' : '#92400e',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        {notification.type === 'success' && <CheckCircle2 size={14} />}
                        {notification.type === 'error' && <AlertCircle size={14} />}
                        {notification.type === 'warning' && <AlertCircle size={14} />}
                        {notification.message}
                    </div>
                )}
            >
                {/* Main Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
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
                            importedItems.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Import Preview</h3>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={handleCancelImport}
                                                style={{ padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmImport}
                                                style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? 'Importing...' : 'Confirm Import'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-container" style={{ flex: 1, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', display: 'flex', flexDirection: 'column' }}>
                                        {/* Table Header */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) 100px 2fr 80px 100px 100px', gap: '8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '16px', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Customer</div>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Container</div>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Shipment</div>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>HS Code</div>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Description</div>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Qty</div>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Weight</div>
                                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>Volume</div>
                                        </div>

                                        {/* Table Body */}
                                        <div style={{ overflowY: 'auto', flex: 1 }}>
                                            {importedItems.map((item, idx) => (
                                                <div key={idx} style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'minmax(100px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) 100px 2fr 80px 100px 100px',
                                                    gap: '8px',
                                                    padding: '16px',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    alignItems: 'center',
                                                    fontSize: '13px'
                                                }}>
                                                    <div style={{ fontWeight: 500, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.customer}>{item.customer}</div>
                                                    <div style={{ color: '#334155', fontFamily: 'monospace', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.container_nbr}>{item.container_nbr}</div>
                                                    <div style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.shipment_nbr}>{item.shipment_nbr}</div>
                                                    <div style={{ color: '#64748b', fontFamily: 'monospace' }}>{item.hs_code || '-'}</div>
                                                    <div style={{ color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.item_description}>{item.item_description || '-'}</div>
                                                    <div style={{ color: '#64748b' }}>{item.quantity} {item.quantity_uom}</div>
                                                    <div style={{ color: '#64748b' }}>{item.gross_weight} {item.weight_uom}</div>
                                                    <div style={{ color: '#64748b' }}>{item.volume} {item.volume_uom}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'right', marginTop: '8px' }}>
                                        Total Items: {importedItems.length}
                                    </div>
                                </div>
                            ) : (
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
                                        {isImporting ? (
                                            <>
                                                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary-color)', margin: 'auto' }} />
                                                <h4 style={{ margin: '8px 0 0 0', color: 'var(--text-color)' }}>Processing...</h4>
                                            </>
                                        ) : (
                                            <>
                                                <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                                                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-color)', textDecoration: 'underline' }}>Click or drag file to upload</h4>
                                                </label>
                                                <input
                                                    id="file-upload"
                                                    type="file"
                                                    accept=".xlsx, .xls"
                                                    onChange={handleFileUpload}
                                                    style={{ display: 'none' }}
                                                />
                                                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Support for Excel (.xlsx) files</p>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => document.getElementById('download-template-link')?.click()}
                                        style={{
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
                                    <a
                                        href="/docs/Customer Inventory CSV.xlsx"
                                        download="Customer Inventory Template.xlsx"
                                        style={{ display: 'none' }}
                                        id="download-template-link"
                                    >
                                        Ref
                                    </a>
                                </div>
                            )
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
                                                <Dropdown
                                                    label="Customer / Liner"
                                                    required
                                                    options={customerOptions}
                                                    value={customer}
                                                    onChange={(val) => {
                                                        setCustomer(val);
                                                        // Find ID from customersData
                                                        const selected = customersData.find(c => c.customer_name === val);
                                                        if (selected) {
                                                            setSelectedCustomerId(selected.customer_nbr);
                                                            // Reset shipment when customer changes
                                                            setOtmShipmentNumber('');
                                                            setShipmentOptions([]);
                                                        }
                                                    }}
                                                    placeholder="Search Customer"
                                                    searchable
                                                    onSearch={handleCustomerSearch}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <Dropdown
                                                        label="Terminal"
                                                        required
                                                        options={terminals.map(t => ({ label: t, value: t }))}
                                                        value={terminal}
                                                        onChange={setTerminal}
                                                        placeholder="Select Terminal"
                                                    />
                                                </div>
                                                <div>
                                                    <Dropdown
                                                        label="Shipment Number"
                                                        required
                                                        options={shipmentOptions}
                                                        value={otmShipmentNumber}
                                                        onChange={(val) => {
                                                            setOtmShipmentNumber(val);

                                                            // Check if shipment has container_nbr
                                                            // Note: Val is shipment_nbr string. Data is in shipmentsData.
                                                            // Logic: 
                                                            // If val is NOT empty: check data.
                                                            // If found and has container, fill and lock.
                                                            // If found but no container, unlock.
                                                            // If not found (user typed custom?), unlock. 

                                                            if (!val) {
                                                                setIsContainerReadOnly(false);
                                                                // Maybe clear container? Or keep?
                                                                // User says: "if he again change the shipment text, make the container text field editable."
                                                                return;
                                                            }

                                                            const selectedShipment = shipmentsData.find(s => s.shipment_nbr === val);

                                                            if (selectedShipment && selectedShipment.container_nbr) {
                                                                setContainerNumber(selectedShipment.container_nbr);
                                                                setIsContainerReadOnly(true);
                                                            } else {
                                                                setIsContainerReadOnly(false);
                                                                // If switching from a locked one to one without container, user might want to enter value.
                                                                // Should we clear? "if the container_nbr is not present ... make the user edit"
                                                                // Possibly keep whatever was there or clear if it was auto-filled?
                                                                // Safest is to just unlock.
                                                            }
                                                        }}
                                                        placeholder="Search Shipment"
                                                        searchable
                                                        onSearch={(q) => {
                                                            // When user types (changes text), unlock container
                                                            setOtmShipmentNumber(q);
                                                            setIsContainerReadOnly(false);
                                                            setContainerNumber(''); // Clear container on edit
                                                            handleShipmentSearch(q);
                                                        }}
                                                        onFocus={() => {
                                                            handleShipmentSearch('');
                                                        }}
                                                        disabled={!customer}
                                                    />
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
                                                <input
                                                    type="text"
                                                    value={containerNumber}
                                                    onChange={e => setContainerNumber(e.target.value)}
                                                    placeholder="ABCD1234567"
                                                    readOnly={isContainerReadOnly}
                                                    style={{
                                                        ...inputStyle,
                                                        backgroundColor: isContainerReadOnly ? '#f1f5f9' : 'white',
                                                        cursor: isContainerReadOnly ? 'not-allowed' : 'text',
                                                        color: isContainerReadOnly ? '#64748b' : 'var(--text-color)'
                                                    }}
                                                />
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
                                                        <div
                                                            key={item.id}
                                                            onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                                            style={{
                                                                background: '#f8fafc',
                                                                borderRadius: '8px',
                                                                border: '1px solid #f1f5f9',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px' }}>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    {expandedItemId === item.id
                                                                        ? <ChevronDown size={14} color="var(--primary-color)" />
                                                                        : <ChevronRight size={14} color="#94a3b8" />
                                                                    }
                                                                    <div>
                                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)' }}>HS: {item.hsCode}</div>
                                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Qty: {item.qty} {item.uom}</div>
                                                                    </div>
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} style={{ padding: '6px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, boxShadow: 'none' }}><Trash2 size={14} /></button>
                                                            </div>

                                                            {/* Expandable Details */}
                                                            {expandedItemId === item.id && (
                                                                <div style={{
                                                                    padding: '0 10px 10px 32px',
                                                                    fontSize: '12px',
                                                                    color: 'var(--text-color)',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '4px',
                                                                    borderTop: '1px dashed #e2e8f0',
                                                                    marginTop: '4px',
                                                                    paddingTop: '8px'
                                                                }}>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
                                                                        <span style={{ color: '#64748b' }}>Desc:</span> <span style={{ fontWeight: 500 }}>{item.description || '-'}</span>
                                                                        <span style={{ color: '#64748b' }}>Weight:</span> <span>{item.grossWeight ? `${item.grossWeight} ${item.weightUom || 'KGM'}` : '-'}</span>
                                                                        <span style={{ color: '#64748b' }}>Volume:</span> <span>{item.volume ? `${item.volume} ${item.volumeUom || 'M3'}` : '-'}</span>
                                                                        <span style={{ color: '#64748b' }}>Origin:</span> <span>{item.countryOfOrigin || '-'}</span>
                                                                        <span style={{ color: '#64748b' }}>UN Class:</span> <span>{item.unClass || '-'}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                    <button
                                        onClick={handleCreateInventory}
                                        disabled={isSubmitting}
                                        style={{
                                            padding: '12px 32px',
                                            background: 'var(--primary-gradient)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            boxShadow: '0 4px 12px rgba(75, 104, 108, 0.3)',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                            opacity: isSubmitting ? 0.7 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Inventory'
                                        )}
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
                                    placeholder={`Search by ${searchFilter.toLowerCase()}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            loadInventory(searchTerm, searchFilter);
                                        }
                                    }}
                                    style={{ ...inputStyle, paddingLeft: '38px', paddingRight: '32px', background: 'white', borderColor: '#e2e8f0' }}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSearchFilter('CUSTOMER');
                                            loadInventory('', 'CUSTOMER');
                                        }}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            padding: '0',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div style={{ width: '180px' }}>
                                <Dropdown
                                    label=""
                                    options={[
                                        { label: 'Customer', value: 'CUSTOMER' },
                                        { label: 'Shipment', value: 'SHIPMENT' },
                                        { label: 'Container', value: 'CONTAINER' }
                                    ]}
                                    value={searchFilter}
                                    onChange={(val) => {
                                        if (val) setSearchFilter(val as any);
                                    }}
                                    placeholder="Filter By"
                                    required
                                />
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
                                {isLoadingInventory ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
                                        <Loader2 size={24} className="animate-spin" style={{ marginRight: '8px' }} />
                                        Loading inventory...
                                    </div>
                                ) : inventoryRecords.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        No inventory records found.
                                    </div>
                                ) : (
                                    inventoryRecords.map((record) => (
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
                                    )))}
                            </div>
                        </div>
                    </div>
                )}
            </PanelLayout >

            {/* Add Item Modal */}
            {
                showAddItemModal && createPortal(
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
                    </div>,
                    document.body
                )
            }

            {showBulkConflictModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div style={{
                        background: 'var(--card-bg)',
                        borderRadius: '20px',
                        width: '500px',
                        maxWidth: '90%',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border-color, #e2e8f0)'
                    }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 700 }}>
                                <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertTriangle size={20} color="#ef4444" />
                                </div>
                                Duplicate Records Found
                            </h3>
                            <button
                                onClick={handleCancelImport}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto' }}>
                            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                                The following records already exist in the system. Continuing will result in duplicates.
                            </p>
                            <div style={{
                                background: '#fff1f2',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid #fecdd3',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {(conflictDetails?.conflicts || []).map((c: any, i: number) => (
                                        <li key={i} style={{
                                            marginBottom: '12px',
                                            fontSize: '13px',
                                            color: '#be123c',
                                            borderBottom: i < (conflictDetails?.conflicts?.length || 0) - 1 ? '1px dashed #fda4af' : 'none',
                                            paddingBottom: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600 }}>Container:</span>
                                                <span style={{ fontFamily: 'monospace' }}>{c.container_nbr}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600 }}>Shipment:</span>
                                                <span style={{ fontFamily: 'monospace' }}>{c.shipment_nbr}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600 }}>HS Code:</span>
                                                <span style={{ fontFamily: 'monospace' }}>{c.hs_code}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <p style={{ margin: '20px 0 0', fontWeight: 600, color: 'var(--text-color)', fontSize: '14px' }}>
                                Do you want to proceed and import these items anyway?
                            </p>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc', borderRadius: '0 0 20px 20px' }}>
                            <button
                                onClick={handleCancelImport}
                                style={{
                                    padding: '10px 24px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--button-bg)',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    color: 'var(--text-color)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                Cancel Import
                            </button>
                            <button
                                onClick={handleForceImport}
                                style={{
                                    padding: '10px 24px',
                                    background: 'var(--primary-gradient)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: 'var(--shadow-md)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Import Anyway
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
