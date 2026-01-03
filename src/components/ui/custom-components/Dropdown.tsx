import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface DropdownOption {
    label: string;
    value: string;
}

interface DropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    searchable?: boolean;
    disabled?: boolean;
    onSearch?: (query: string) => void;
    onFocus?: () => void;
    loading?: boolean;
}

export default function Dropdown({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    required = false,
    searchable = false,
    disabled = false,
    onSearch,
    onFocus,
    loading = false
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    // inputValue tracks what the user sees in the text box
    const [inputValue, setInputValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const prevValue = useRef(value);

    // Initial label
    useEffect(() => {
        if (value !== prevValue.current) {
            // Value changed externally or by selection
            const selected = options.find(o => o.value === value);
            if (selected) {
                setInputValue(selected.label);
            } else {
                if (!value) setInputValue('');
            }
            prevValue.current = value;
        } else {
            // Options changed, but value stayed same
            // Check if input is focused to prevent overwriting user typing
            const isFocused = inputRef.current && document.activeElement === inputRef.current;

            if (!isFocused && value) {
                const selected = options.find(o => o.value === value);
                if (selected) {
                    setInputValue(selected.label);
                }
            }
        }
    }, [value, options]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur, reset input to selected value label
                const selectedOption = options.find(opt => opt.value === value);
                if (selectedOption) {
                    setInputValue(selectedOption.label);
                } else {
                    setInputValue('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options]);

    const listRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to reveal dropdown when opened
    useEffect(() => {
        if (isOpen && listRef.current) {
            setTimeout(() => {
                if (listRef.current) {
                    listRef.current.scrollTop = 0;
                    listRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setIsOpen(true);

        if (onSearch) {
            onSearch(val);
        }

        if (val === '') {
            onChange('');
        }
    };

    const handleOptionClick = (option: DropdownOption) => {
        onChange(option.value);
        setInputValue(option.label);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setInputValue('');
        setIsOpen(false);
        if (onSearch) onSearch('');
    };

    // If onSearch is provided, we assume 'options' is already filtered by parent.
    // Otherwise, we filter locally.
    const filteredOptions = (searchable && inputValue && !onSearch)
        ? options.filter(opt => opt.label.toLowerCase().includes(inputValue.toLowerCase()))
        : options;

    const showClear = value && !disabled && !required;

    return (
        <div style={{ width: '100%' }} ref={containerRef}>
            {label && (
                <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    letterSpacing: '0.02em',
                }}>
                    {label} {required && <span style={{ color: 'red' }}>*</span>}
                </label>
            )}

            <div style={{ position: 'relative' }}>
                <div
                    onClick={() => {
                        if (!disabled) {
                            setIsOpen(!isOpen);
                            if (!isOpen && searchable && inputRef.current) {
                                inputRef.current.focus();
                            }
                        }
                    }}
                    style={{
                        width: '100%',
                        padding: '0',
                        background: disabled ? '#f1f5f9' : '#f8fafc',
                        border: isOpen ? '1px solid var(--primary-color)' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                        boxShadow: isOpen ? '0 0 0 3px rgba(75, 104, 108, 0.1)' : 'none',
                        cursor: searchable ? 'text' : 'pointer',
                        opacity: disabled ? 0.7 : 1,
                        position: 'relative',
                        minHeight: '44px',
                        boxSizing: 'border-box'
                    }}
                >
                    {searchable ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onFocus={() => {
                                setIsOpen(true);
                                if (onFocus) onFocus();
                            }}
                            placeholder={placeholder}
                            disabled={disabled}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: 'var(--text-color)',
                                cursor: disabled ? 'not-allowed' : 'text'
                            }}
                        />
                    ) : (
                        <div style={{
                            padding: '12px 14px',
                            flex: 1,
                            fontSize: '14px',
                            lineHeight: '20px',
                            color: value ? 'var(--text-color)' : '#94a3b8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {value ? options.find(o => o.value === value)?.label : placeholder}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', paddingRight: '10px' }}>
                        {loading && (
                            <div style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}>
                                {/* Simple CSS spinner or Lucide loader */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                            </div>
                        )}
                        {showClear && !disabled && !loading && (
                            <div
                                onClick={handleClear}
                                style={{
                                    padding: '4px',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    visibility: (value || inputValue) ? 'visible' : 'hidden'
                                }}
                            >
                                <X size={14} />
                            </div>
                        )}
                        <ChevronDown
                            size={16}
                            color={isOpen ? 'var(--primary-color)' : '#94a3b8'}
                            style={{
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                marginLeft: '4px',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                </div>

                {isOpen && !disabled && (
                    <div
                        ref={listRef}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            overflow: 'hidden',
                            zIndex: 100,
                            animation: 'fadeIn 0.1s ease-out'
                        }}>
                        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <div
                                        key={`${option.value}-${index}`}
                                        onClick={() => handleOptionClick(option)}
                                        style={{
                                            padding: '10px 14px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            color: option.value === value ? 'var(--primary-color)' : 'var(--text-color)',
                                            background: option.value === value ? '#f0f9ff' : 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'background 0.1s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (option.value !== value) e.currentTarget.style.background = '#f8fafc';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (option.value !== value) e.currentTarget.style.background = 'white';
                                        }}
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        {option.label}
                                        {option.value === value && <Check size={14} />}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                    No options found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
