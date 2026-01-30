import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { adminService } from '../../../api/handlers/adminApi';
import type { AdminUser } from '../../../api/types/adminTypes';
import { Loader2, User as UserIcon, Edit2, Trash2, AlertTriangle, Search, X, Filter, Check, Plus, ChevronDown } from 'lucide-react';

import { useAdminStore } from '../../../store/adminStore';

import UserEditExpanded from './UserEditExpanded';

export default function UserManagement() {
    const containerRef = useRef<HTMLDivElement>(null);
    const expandedContainerRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const [originRect, setOriginRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
    const [isExiting, setIsExiting] = useState(false);
    const {
        users,
        availableRoles,
        fetchUsers
    } = useAdminStore();

    // const [users, setUsers] = useState<AdminUser[]>([]); // REPLACED BY STORE
    const [searchQuery, setSearchQuery] = useState('');

    // Derived loading state
    const isLoading = users.length === 0;

    // Filters
    const [selectedRoleFilters, setSelectedRoleFilters] = useState<string[]>([]);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
    const [activeFilterDropdown, setActiveFilterDropdown] = useState<'ROLE' | 'STATUS' | null>(null);

    // Edit User State
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);


    // Create User State
    // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // REMOVED
    const [isCreating, setIsCreating] = useState(false);

    // Premium Add User Animation State
    const [isAddUserExpanded, setIsAddUserExpanded] = useState(false);
    const [isAddUserAnimating, setIsAddUserAnimating] = useState(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

    const addUserBtnRef = useRef<HTMLButtonElement>(null);
    const addUserPanelRef = useRef<HTMLDivElement>(null);
    const addUserContentRef = useRef<HTMLDivElement>(null);
    const [btnRect, setBtnRect] = useState<DOMRect | null>(null);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: ''
    });

    const handleOpenAddUser = () => {
        if (addUserBtnRef.current) {
            const rect = addUserBtnRef.current.getBoundingClientRect();
            setBtnRect(rect);
        }
        setIsAddUserExpanded(true);
        setIsAddUserAnimating(true);
    };

    const handleCloseAddUser = () => {
        setIsAddUserExpanded(false);
        // animating state remains true until GSAP onComplete
    };

    // GSAP Animation for Add User Panel
    useEffect(() => {
        if (isAddUserExpanded && addUserPanelRef.current && addUserContentRef.current && btnRect) {
            // ENTER ANIMATION

            // 1. Initial State: Match Button (Hidden visual, but same dimensions)
            // Since panel is absolute top-right relative to parent container, we might need adjustments if button isn't.
            // But we placed the panel in the same relative container as the button. 
            // We'll set initial width/height to match button (approx 120px, 40px)

            gsap.set(addUserPanelRef.current, {
                width: 120, // Approximate header button width
                height: 40,
                borderRadius: '12px',
                background: 'rgba(247, 207, 155, 0.1)', // Match button bg
                border: '1px dashed rgba(247, 207, 155, 0.5)',
                overflowY: 'hidden' // Start hidden
            });

            gsap.set(addUserContentRef.current, { opacity: 0 });

            const tl = gsap.timeline();

            tl.to(addUserPanelRef.current, {
                width: 420, // Increased width
                height: 'auto', // GSAP can animate to auto height
                maxHeight: 'calc(100vh - 220px)', // Constrain height to viewport/tab area
                background: 'rgba(75, 104, 108, 0.98)', // High opacity theme color to block background
                backdropFilter: 'blur(20px)', // Stronger blur
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                duration: 0.5,
                ease: 'back.out(0.8)',
                onComplete: () => {
                    if (addUserPanelRef.current) {
                        addUserPanelRef.current.style.overflowY = 'auto'; // Enable scroll after open
                    }
                }
            })
                .to(addUserContentRef.current, {
                    opacity: 1,
                    duration: 0.3
                }, "-=0.2"); // Overlap slightly

        } else if (!isAddUserExpanded && isAddUserAnimating && addUserPanelRef.current && addUserContentRef.current) {
            // EXIT ANIMATION
            const tl = gsap.timeline({
                onComplete: () => {
                    setIsAddUserAnimating(false);
                    setNewUser({ name: '', email: '', role: '' }); // Reset form on close
                    setIsRoleDropdownOpen(false);
                }
            });

            // Lock overflow during exit
            if (addUserPanelRef.current) addUserPanelRef.current.style.overflowY = 'hidden';

            tl.to(addUserContentRef.current, {
                opacity: 0,
                duration: 0.2
            })
                .to(addUserPanelRef.current, {
                    width: 120,
                    height: 40,
                    maxHeight: '40px', // Reset max height
                    borderRadius: '12px',
                    background: 'rgba(247, 207, 155, 0.1)',
                    backdropFilter: 'blur(0px)',
                    border: '1px dashed rgba(247, 207, 155, 0.5)',
                    duration: 0.4,
                    ease: 'power3.inOut'
                });
        }
    }, [isAddUserExpanded, btnRect]); // trigger on expanded change


    const handleCreateUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.role) {
            alert("Please fill all fields");
            return;
        }
        setIsCreating(true);
        try {
            await adminService.createUser(newUser);
            // Refresh users
            await fetchUsers(true);

            // Close with animation
            handleCloseAddUser();

        } catch (e) {
            console.error("Failed to create user", e);
            alert("Failed to create user. Check console for details.");
        } finally {
            setIsCreating(false);
        }
    };

    // Delete User State
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await adminService.deleteUser(userToDelete.EMAIL);
            await fetchUsers(true);
            setUserToDelete(null);
        } catch (e) {
            console.error("Failed to delete user", e);
            alert("Failed to delete user. Check console for details.");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // loadData removed (handled by store)

    const handleEditUser = (user: AdminUser, e: React.MouseEvent) => {
        // Prevent opening if already open or exiting
        if (editingUser || isExiting) return;

        // Capture the row's position relative to the viewport/container
        const row = (e.target as HTMLElement).closest('tr');
        if (row && containerRef.current) {
            const rowRect = row.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();

            // Calculate position relative to container
            setOriginRect({
                top: rowRect.top - containerRect.top,
                left: rowRect.left - containerRect.left,
                width: rowRect.width,
                height: rowRect.height
            });
        }
        setEditingUser(user);
    };

    const handleCloseExpanded = () => {
        if (!originRect) {
            // Fallback if origin is lost
            setEditingUser(null);
            return;
        }
        setIsExiting(true);
    };

    // GSAP Animation for Enter/Exit
    useLayoutEffect(() => {
        if (editingUser && originRect && expandedContainerRef.current && !isExiting) {

            // Initial Set for Backdrop
            if (backdropRef.current) {
                gsap.set(backdropRef.current, { opacity: 0 });
                gsap.to(backdropRef.current, {
                    opacity: 1,
                    duration: 0.5,
                    ease: 'power2.inOut'
                });
            }

            // Enter Animation
            gsap.fromTo(expandedContainerRef.current,
                {
                    top: originRect.top,
                    left: originRect.left,
                    width: originRect.width,
                    height: originRect.height,
                    borderRadius: '8px', // Start with row's approximate radius
                    opacity: 1, // Start fully visible to look like the row transforming
                    boxShadow: '0 0 0 rgba(0,0,0,0)'
                },
                {
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '0px',
                    opacity: 1,
                    boxShadow: 'none',
                    duration: 0.5,
                    ease: 'expo.inOut',
                    pointerEvents: 'auto'
                }
            );
        } else if (isExiting && (originRect || expandedContainerRef.current)) { // Relaxed check allowing exit even if origin lost technically (though handled above)

            // Backdrop Exit
            if (backdropRef.current) {
                gsap.to(backdropRef.current, {
                    opacity: 0,
                    duration: 0.4,
                    ease: 'power2.inOut'
                });
            }

            // Exit Animation
            if (expandedContainerRef.current) {
                gsap.to(expandedContainerRef.current, {
                    top: originRect ? originRect.top : 0,
                    left: originRect ? originRect.left : 0,
                    width: originRect ? originRect.width : '100%',
                    height: originRect ? originRect.height : '100%',
                    borderRadius: '8px',
                    opacity: 0,
                    boxShadow: '0 0 0 rgba(0,0,0,0)',
                    duration: 0.5,
                    ease: 'expo.inOut',
                    onComplete: () => {
                        setEditingUser(null);
                        setIsExiting(false);
                        setOriginRect(null);
                    }
                });
            } else {
                setEditingUser(null);
                setIsExiting(false);
            }
        }
    }, [editingUser, isExiting, originRect]);

    const handleUpdateUser = async (updatedData: any) => {
        try {
            await adminService.updateUser(updatedData);
            // Refresh
            await fetchUsers(true);
            setEditingUser(null);
            setOriginRect(null);
        } catch (e) {
            console.error("Failed to update user", e);
            alert("Failed to update user.");
            throw e; // Propagate to child for loading state
        }
    };



    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.EMAIL.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.NAME.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = selectedRoleFilters.length === 0
            ? true
            : user.ROLES && user.ROLES.some(role => selectedRoleFilters.includes(role));

        const matchesStatus = selectedStatusFilter === 'ALL'
            ? true
            : selectedStatusFilter === 'ACTIVE' ? user.IS_ACTIVE === 'Y' : user.IS_ACTIVE === 'N';

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', position: 'relative' }}>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px' }}>
                {/* Search Bar Input */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    gap: '12px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <Search size={18} color="rgba(255, 255, 255, 0.4)" />
                    <input
                        type="text"
                        placeholder="Search users by email or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none',
                            flex: 1,
                            minWidth: 0
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.4)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 0
                            }}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Role Filter and Status Filter removed from here */}

                {/* Premium Add User Section */}
                <div style={{ position: 'relative', zIndex: 100 }}>
                    {/* Placeholder Button to hold space if needed, or better: The button itself transforms */}
                    {/* We used Absolute positioning for the transformation overlaid, so we keep the button for layout 
                        but hide it when expanded to prevent duplicate visuals? 
                        Actually, transforming the button directly is cleaner if we wrapper it.
                    */}

                    {!isAddUserExpanded && !editingUser && (
                        <button
                            ref={addUserBtnRef}
                            onClick={handleOpenAddUser}
                            className="add-user-btn-trigger"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                border: '1px dashed rgba(247, 207, 155, 0.5)',
                                background: 'rgba(247, 207, 155, 0.1)',
                                color: 'var(--secondary-color)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Plus size={18} />
                            Add User
                        </button>
                    )}

                    {/* The Morphing Panel */}
                    {(isAddUserExpanded || isAddUserAnimating) && (
                        <div
                            ref={addUserPanelRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: 'auto', // GSAP will handle
                                height: 'auto', // GSAP will handle
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                borderRadius: '12px',
                                border: '1px solid rgba(247, 207, 155, 0.2)',
                                overflow: 'hidden',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                transformOrigin: 'top right'
                            }}
                        >
                            {/* Inner Content - Fades In/Out */}
                            <div
                                ref={addUserContentRef}
                                style={{
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px',
                                    width: '100%', // Fill panel
                                    boxSizing: 'border-box', // Prevent padding from causing overflow
                                    opacity: 0
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            background: 'linear-gradient(135deg, rgba(247, 207, 155, 0.2) 0%, rgba(247, 207, 155, 0.05) 100%)',
                                            borderRadius: '50%', // Perfect Circle
                                            border: '1px solid rgba(247, 207, 155, 0.1)'
                                        }}>
                                            <UserIcon size={18} color="#F7CF9B" />
                                        </div>
                                        Create New User
                                    </h3>
                                    <button
                                        onClick={handleCloseAddUser}
                                        style={{
                                            background: 'transparent', border: 'none',
                                            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                            padding: '4px', display: 'flex',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Name Field */}
                                    <div className="premium-field-group">
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 600, letterSpacing: '0.05em' }}>FULL NAME</label>
                                        <input
                                            value={newUser.name}
                                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                            placeholder="e.g. John Doe"
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                outline: 'none',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--secondary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        />
                                    </div>

                                    {/* Email Field */}
                                    <div className="premium-field-group">
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 600, letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
                                        <input
                                            value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                            placeholder="user@gmail.com"
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                outline: 'none',
                                                fontSize: '14px',
                                                boxSizing: 'border-box',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--secondary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        />
                                    </div>

                                    {/* World Class Dropdown */}
                                    <div className="premium-field-group" style={{ position: 'relative' }}>
                                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 600, letterSpacing: '0.05em' }}>ASSIGN ROLE</label>
                                        <div
                                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                border: isRoleDropdownOpen ? '1px solid var(--secondary-color)' : '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: newUser.role ? 'white' : 'rgba(255,255,255,0.4)',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                boxSizing: 'border-box',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {newUser.role || 'Select Role'}
                                            <div style={{ transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                                                <ChevronDown size={16} style={{ opacity: 0.7 }} />
                                            </div>
                                        </div>

                                        {/* Dropdown Options */}
                                        {isRoleDropdownOpen && (
                                            <div
                                                className="custom-scrollbar"
                                                style={{
                                                    marginTop: '8px',
                                                    background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.95) 0%, rgba(58, 82, 85, 0.95) 100%)',
                                                    backdropFilter: 'blur(12px)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                    zIndex: 50,
                                                    padding: '4px',
                                                    overflow: 'hidden',
                                                    // Removed absolute positioning to push content down
                                                    maxHeight: '300px', // Increased height to show more items
                                                    overflowY: 'auto'
                                                }}
                                            >
                                                {availableRoles.map(role => (
                                                    <div
                                                        key={role}
                                                        onClick={() => { setNewUser({ ...newUser, role }); setIsRoleDropdownOpen(false); }}
                                                        style={{
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            color: 'white',
                                                            fontSize: '14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            background: newUser.role === role ? 'rgba(247, 207, 155, 0.1)' : 'transparent',
                                                            border: newUser.role === role ? '1px solid rgba(247, 207, 155, 0.1)' : '1px solid transparent',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = newUser.role === role ? 'rgba(247, 207, 155, 0.1)' : 'transparent'}
                                                    >
                                                        <div style={{
                                                            width: '8px', height: '8px', borderRadius: '50%',
                                                            background: newUser.role === role ? 'var(--secondary-color)' : 'rgba(255,255,255,0.2)'
                                                        }} />
                                                        {role}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateUser}
                                    disabled={isCreating || !newUser.name || !newUser.role}
                                    style={{
                                        marginTop: '10px',
                                        width: '100%',
                                        padding: '14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: isCreating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #F7CF9B 0%, #E5B070 100%)',
                                        color: '#1e293b',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: isCreating ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: isCreating ? 'none' : '0 4px 15px rgba(247, 207, 155, 0.3)',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {isCreating ? <Loader2 size={18} className="animate-spin" /> : 'Create User'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                                <th style={{ padding: '12px', fontWeight: 500 }}>User</th>
                                <th style={{ padding: '12px', fontWeight: 500 }}>Roles</th>
                                <th style={{ padding: '12px', fontWeight: 500 }}>Status</th>
                                <th style={{ padding: '12px', fontWeight: 500 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="dark-shimmer" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div className="dark-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
                                                <div className="dark-shimmer" style={{ width: '180px', height: '12px', borderRadius: '4px' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div className="dark-shimmer" style={{ width: '100px', height: '24px', borderRadius: '12px' }} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div className="dark-shimmer" style={{ width: '60px', height: '20px', borderRadius: '12px' }} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div className="dark-shimmer" style={{ width: '24px', height: '24px', borderRadius: '4px', float: 'right' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                                <th style={{ padding: '12px', fontWeight: 500 }}>User</th>
                                <th style={{ padding: '12px', fontWeight: 500, position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Roles
                                        {selectedRoleFilters.length > 0 && (
                                            <span style={{
                                                background: 'var(--secondary-color)',
                                                color: '#1e293b',
                                                borderRadius: '50%',
                                                width: '18px',
                                                height: '18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '10px',
                                                fontWeight: 700
                                            }}>
                                                {selectedRoleFilters.length}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'ROLE' ? null : 'ROLE')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '4px',
                                                color: selectedRoleFilters.length > 0 ? 'var(--secondary-color)' : 'rgba(255,255,255,0.4)',
                                                display: 'flex', alignItems: 'center'
                                            }}
                                        >
                                            <Filter size={14} fill={selectedRoleFilters.length > 0 ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                    {/* Role Filter Dropdown */}
                                    {activeFilterDropdown === 'ROLE' && (
                                        <>
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setActiveFilterDropdown(null)} />
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.95) 0%, rgba(58, 82, 85, 0.95) 100%)',
                                                backdropFilter: 'blur(12px)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                padding: '8px',
                                                zIndex: 30,
                                                minWidth: '200px',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                                            }}>
                                                {availableRoles.map(role => {
                                                    const isSelected = selectedRoleFilters.includes(role);
                                                    return (
                                                        <div
                                                            key={role}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedRoleFilters(prev => prev.filter(r => r !== role));
                                                                } else {
                                                                    setSelectedRoleFilters(prev => [...prev, role]);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '8px 12px',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                fontSize: '14px',
                                                                color: 'white',
                                                                marginTop: '2px',
                                                                background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: '16px', height: '16px', borderRadius: '4px',
                                                                    border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.3)',
                                                                    background: isSelected ? 'var(--secondary-color)' : 'transparent',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}>
                                                                    {isSelected && <Check size={12} color="#1e293b" strokeWidth={3} />}
                                                                </div>
                                                                {role}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </th>
                                <th style={{ padding: '12px 40px 12px 12px', fontWeight: 500, position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Status
                                        <button
                                            onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'STATUS' ? null : 'STATUS')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '4px',
                                                color: selectedStatusFilter !== 'ALL' ? 'var(--secondary-color)' : 'rgba(255,255,255,0.4)',
                                                display: 'flex', alignItems: 'center'
                                            }}
                                        >
                                            <Filter size={14} fill={selectedStatusFilter !== 'ALL' ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                    {/* Status Filter Dropdown */}
                                    {activeFilterDropdown === 'STATUS' && (
                                        <>
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setActiveFilterDropdown(null)} />
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.95) 0%, rgba(58, 82, 85, 0.95) 100%)',
                                                backdropFilter: 'blur(12px)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                padding: '8px',
                                                zIndex: 30,
                                                minWidth: '160px',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                                            }}>
                                                {[
                                                    { label: 'All Status', value: 'ALL' },
                                                    { label: 'Active', value: 'ACTIVE' },
                                                    { label: 'Inactive', value: 'INACTIVE' }
                                                ].map(opt => (
                                                    <div
                                                        key={opt.value}
                                                        onClick={() => { setSelectedStatusFilter(opt.value); setActiveFilterDropdown(null); }}
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            fontSize: '14px',
                                                            color: 'white',
                                                            marginTop: '2px',
                                                            background: selectedStatusFilter === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent'
                                                        }}
                                                    >
                                                        {opt.label}
                                                        {selectedStatusFilter === opt.value && <Check size={14} color="var(--secondary-color)" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </th>
                                <th style={{ padding: '0px', fontWeight: 500 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr key={user.USER_ID} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '16px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                    <UserIcon size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ color: 'white', fontWeight: 500 }}>{user.NAME}</div>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{user.EMAIL}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {user.ROLES && user.ROLES.length > 0 ? user.ROLES.map((role, idx) => (
                                                    <span key={role} style={{
                                                        fontSize: '11px',
                                                        background: idx === 0 ? 'rgba(247, 207, 155, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                        color: idx === 0 ? 'var(--secondary-color)' : 'rgba(255, 255, 255, 0.6)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        border: idx === 0 ? '1px solid rgba(247, 207, 155, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                        fontWeight: idx === 0 ? 600 : 400
                                                    }}>
                                                        {role}
                                                    </span>
                                                )) : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No Roles</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 40px 16px 12px' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                letterSpacing: '0.02em',
                                                textTransform: 'uppercase',
                                                background: user.IS_ACTIVE === 'Y' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                color: user.IS_ACTIVE === 'Y' ? '#10b981' : 'rgba(255, 255, 255, 0.5)',
                                                border: user.IS_ACTIVE === 'Y' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                boxShadow: user.IS_ACTIVE === 'Y' ? '0 0 12px rgba(16, 185, 129, 0.1)' : 'none'
                                            }}>
                                                <div style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: user.IS_ACTIVE === 'Y' ? '#10b981' : 'rgba(255, 255, 255, 0.3)',
                                                    boxShadow: user.IS_ACTIVE === 'Y' ? '0 0 6px #10b981' : 'none'
                                                }} />
                                                {user.IS_ACTIVE === 'Y' ? 'Active' : 'Inactive'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0px 0px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '24px' }}>
                                                {/* Premium Edit Button */}
                                                <button
                                                    onClick={(e) => handleEditUser(user, e)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid transparent',
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        padding: '8px',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: 'none',
                                                        outline: 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const target = e.currentTarget;
                                                        target.style.transform = 'translateY(-2px) scale(1.05)';
                                                        target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)';
                                                        target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2), 0 0 10px rgba(255, 255, 255, 0.1)';
                                                        target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                                                        target.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const target = e.currentTarget;
                                                        target.style.transform = 'none';
                                                        target.style.background = 'transparent';
                                                        target.style.boxShadow = 'none';
                                                        target.style.borderColor = 'transparent';
                                                        target.style.color = 'rgba(255, 255, 255, 0.7)';
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(1px) scale(0.95)';
                                                    }}
                                                    onMouseUp={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                                    }}
                                                >
                                                    <Edit2 size={16} strokeWidth={2.5} />
                                                </button>

                                                {/* Premium Delete Button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setUserToDelete(user); }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid transparent',
                                                        color: 'rgba(239, 68, 68, 0.7)',
                                                        padding: '8px',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: 'none',
                                                        outline: 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const target = e.currentTarget;
                                                        target.style.transform = 'translateY(-2px) scale(1.05)';
                                                        target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)';
                                                        target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.2), 0 0 10px rgba(239, 68, 68, 0.1)';
                                                        target.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                                                        target.style.color = '#ff6b6b';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const target = e.currentTarget;
                                                        target.style.transform = 'none';
                                                        target.style.background = 'transparent';
                                                        target.style.boxShadow = 'none';
                                                        target.style.borderColor = 'transparent';
                                                        target.style.color = 'rgba(239, 68, 68, 0.7)';
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(1px) scale(0.95)';
                                                    }}
                                                    onMouseUp={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                                    }}
                                                >
                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <Search size={24} style={{ opacity: 0.3 }} />
                                            <span>No users found matching "{searchQuery}"</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Expanded Edit View */}
            {(editingUser || isExiting) && (
                <>
                    {/* Backdrop */}
                    <div
                        ref={backdropRef}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 40,
                            borderRadius: '16px' // Matches container radius
                        }}
                    />

                    {/* Expanded Content */}
                    <div
                        ref={expandedContainerRef}
                        style={{
                            position: 'absolute',
                            // Styles handled by GSAP (top, left, width, height)
                            background: 'linear-gradient(rgba(0, 0, 0, 0.235), rgba(0, 0, 0, 0.2)), linear-gradient(135deg, rgba(75, 104, 108, 1) 0%, rgba(47, 72, 88, 1) 100%)',
                            zIndex: 50,
                            overflow: 'hidden',
                            boxShadow: 'none', // Removed shadow to prevent seam artifacts
                            // Box shadow handled by GSAP
                        }}
                    >
                        <UserEditExpanded
                            user={editingUser!}
                            availableRoles={availableRoles}
                            onSave={handleUpdateUser}
                            onCancel={handleCloseExpanded}
                        />
                    </div>
                </>
            )}



            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 110
                }}>
                    <div style={{
                        width: '400px',
                        background: 'linear-gradient(135deg, rgba(75, 104, 108, 0.95) 0%, rgba(58, 82, 85, 0.95) 100%)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '20px',
                        padding: '32px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#ef4444',
                            boxShadow: '0 0 20px rgba(239, 68, 68, 0.1)'
                        }}>
                            <AlertTriangle size={32} />
                        </div>

                        <div>
                            <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '20px' }}>Delete User</h3>
                            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '15px' }}>
                                Are you sure you want to delete <strong>{userToDelete.NAME}</strong>? This action cannot be undone.
                            </p>
                        </div>

                        <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
                            <button
                                onClick={() => setUserToDelete(null)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={isDeleting}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                    background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    opacity: isDeleting ? 0.7 : 1
                                }}
                            >
                                {isDeleting && <Loader2 size={18} className="animate-spin" />}
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

