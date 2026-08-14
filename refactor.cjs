const fs = require('fs');

try {
    const path = 'src/features/operations/components/GateInPanel.tsx';
    let content = fs.readFileSync(path, 'utf8');

    // 1. Add Imports
    content = content.replace(
    /import \{ yardApi \} from '\.\.\/\.\.\/yard-planning\/apis\/yardApi';/,
    "import { yardApi } from '../../yard-planning/apis/yardApi';\nimport GateInContainerForm, { ContainerEntryData } from './GateInContainerForm';"
    );

    // Remove unused useCustomerBookingsQuery, useBookingShipmentsQuery
    content = content.replace(
    /,\s*useCustomerBookingsQuery,\s*useBookingShipmentsQuery,\s*/,
    ', '
    );
    // Cleanup another occurrence if it exists
    content = content.replace(/useCustomerBookingsQuery,\s*useBookingShipmentsQuery,\s*/, '');

    // 2. Replace State Block
    // Find from: "// Customer/Booking/Shipment selection state"
    // To: "    }, [bookingOrderType]);"
    const stateRegex = /\/\/ Customer\/Booking\/Shipment selection state[\s\S]*?}, \[bookingOrderType\]\);/g;
    content = content.replace(stateRegex, `// Container Mode & Form State
    const [gateMode, setGateMode] = useState<'Single' | 'Double'>('Single');
    const [containerEntries, setContainerEntries] = useState<{ isValid: boolean, data: ContainerEntryData }[]>([
        { isValid: false, data: {} as ContainerEntryData },
        { isValid: false, data: {} as ContainerEntryData }
    ]);
    
    const handleContainerDataChange = useCallback((index: number) => (isValid: boolean, data: ContainerEntryData) => {
        setContainerEntries(prev => {
            const next = [...prev];
            next[index] = { isValid, data };
            return next;
        });
    }, []);`);

    // 3. Re-define isInboundContainer and canSubmit
    // Find from: "// Computed states - skip selections for INBOUND_CONTAINER (already has all data)"
    // To: "// Filtered lists for searchable dropdowns"
    const computedBlockRegex = /\/\/ Computed states - skip selections for INBOUND_CONTAINER \(already has all data\)[\s\S]*?\/\/ Filtered lists for searchable dropdowns/g;
    content = content.replace(computedBlockRegex, `// Computed states
    const isInboundContainer = truckDetails?.shipmentName === 'INBOUND_CONTAINER';

    const canSubmit = useMemo(() => {
        if (!truckDetails) return false;
        if (!containerEntries[0].isValid) return false;
        if (gateMode === 'Double' && !containerEntries[1].isValid) return false;
        return true;
    }, [truckDetails, containerEntries, gateMode]);

    // `);

    // 4. Remove Dropdown filtered lists
    // Find from: "// Filtered lists for searchable dropdowns" ... To: "// Reset state when panel closes"
    // (Already captured the start in step 3 partially, let's catch what's remaining)
    const dropDownFiltersRegex = /    const filteredCustomers = useMemo\([\s\S]*?\/\/ Reset state when panel closes/g;
    content = content.replace(dropDownFiltersRegex, '// Reset state when panel closes');

    // 5. Update Reset State
    const resetStateRegex = /setSelectedCustomer\(null\);\s*setSelectedBooking\(null\);\s*setSelectedShipment\(null\);\s*setBookingOrderType\(null\);\s*setContainerNumber\(.*?\);/g;
    content = content.replace(resetStateRegex, `setGateMode('Single');
            setContainerEntries([
                { isValid: false, data: {} as ContainerEntryData },
                { isValid: false, data: {} as ContainerEntryData }
            ]);`);

    // 6. Remove auto scroll effects
    const autoScrollRegex = /\/\/ Auto-scroll dropdowns into view when opened[\s\S]*?\/\/ Handle truck selection from list/g;
    content = content.replace(autoScrollRegex, '// Handle truck selection from list');

    // 7. Update handleBackToList and handleDone to clear only needed state
    const clearOldVarsRegex = /setSelectedCustomer\(null\);\s*setSelectedBooking\(null\);\s*setSelectedShipment\(null\);\s*setBookingOrderType\(null\);/g;
    content = content.replace(clearOldVarsRegex, `setGateMode('Single');
        setContainerEntries([
            { isValid: false, data: {} as ContainerEntryData },
            { isValid: false, data: {} as ContainerEntryData }
        ]);`);

    // 8. Handle Submit Gate In replacement
    const submitLogicRegex = /\/\/ Submit Gate In[\s\S]*?\/\/ Styles/g;
    content = content.replace(submitLogicRegex, `// Submit Gate In
    const handleSubmitGateIn = async () => {
        if (!truckDetails || !canSubmit) return;

        try {
            const containersToSubmit = [];
            
            // Push container 1
            const c1 = containerEntries[0].data;
            containersToSubmit.push({
                shipment_nbr: c1.shipment_nbr || truckDetails.shipmentNumber || '',
                container_nbr: c1.container_nbr || truckDetails.containerNumber || '',
                order_type: c1.order_type || truckDetails.orderNumber || '',
                customer_nbr: c1.customer_nbr,
                customer_name: c1.customer_name,
                booking_id: c1.booking_id
            });

            // Push container 2 if double mode
            if (gateMode === 'Double') {
                const c2 = containerEntries[1].data;
                containersToSubmit.push({
                    shipment_nbr: c2.shipment_nbr || '',
                    container_nbr: c2.container_nbr || '',
                    order_type: c2.order_type || '',
                    customer_nbr: c2.customer_nbr,
                    customer_name: c2.customer_name,
                    booking_id: c2.booking_id
                });
            }

            await submitMutation.mutateAsync({
                truck_nbr: truckDetails.truckNumber,
                driver_nbr: truckDetails.driverName || '',
                truck_type: truckDetails.truckType || '3PL',
                containers: containersToSubmit,
                documents: documents
            });

            showToast('success', 'Gate In submitted successfully');
            setStep('success');
        } catch (error) {
            console.error('Error submitting gate in:', error);
            showToast('error', 'Failed to submit Gate In');
        }
    };

    // Styles`);


    // 9. Replace UI Render chunk (from Customer Selection to Documents)
    const renderUIRegex = /\{\/\* Customer Selection \*\/\}[\s\S]*?\{\/\* Document Upload Section - only for non-CRO\/LRO \*\/\}/g;
    content = content.replace(renderUIRegex, `{/* MODE TOGGLE */}
                    {!isInboundContainer && (
                        <div style={{ marginBottom: '16px', display: 'flex', background: \`\${theme.colors.primary}0a\`, padding: '4px', borderRadius: '12px' }}>
                            <button
                                onClick={() => setGateMode('Single')}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: gateMode === 'Single' ? theme.colors.background.primary : 'transparent',
                                    color: gateMode === 'Single' ? theme.colors.primary : theme.colors.text.secondary,
                                    fontWeight: gateMode === 'Single' ? 700 : 500,
                                    boxShadow: gateMode === 'Single' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Single Container
                            </button>
                            <button
                                onClick={() => setGateMode('Double')}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: gateMode === 'Double' ? theme.colors.background.primary : 'transparent',
                                    color: gateMode === 'Double' ? theme.colors.primary : theme.colors.text.secondary,
                                    fontWeight: gateMode === 'Double' ? 700 : 500,
                                    boxShadow: gateMode === 'Double' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Double Container
                            </button>
                        </div>
                    )}

                    {/* CONTAINER FORMS */}
                    <GateInContainerForm 
                        index={0} 
                        title="Container 1 Details" 
                        truckDetails={truckDetails} 
                        onDataChange={handleContainerDataChange(0)} 
                    />
                    
                    {gateMode === 'Double' && (
                        <GateInContainerForm 
                            index={1} 
                            title="Container 2 Details" 
                            truckDetails={truckDetails} 
                            onDataChange={handleContainerDataChange(1)} 
                        />
                    )}

                    {/* Document Upload Section - only for non-CRO/LRO */}`);

    fs.writeFileSync('src/features/operations/components/GateInPanel.tsx', content);
    console.log('Successfully refactored GateInPanel');
} catch (e) {
    console.error(e);
}
