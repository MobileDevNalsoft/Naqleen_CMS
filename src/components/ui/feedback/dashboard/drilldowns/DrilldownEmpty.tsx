import React from 'react';
import PremiumStateView from '../../PremiumStateView';
import { Search } from 'lucide-react';

interface DrilldownEmptyProps {
    onClear?: () => void;
}

const DrilldownEmpty: React.FC<DrilldownEmptyProps> = ({ onClear }) => {
    return (
        <PremiumStateView
            type="empty"
            graphic={
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                }}>
                    <Search size={32} color="#94A3B8" />
                </div>
            }
            title="No Intelligence Found"
            description="Try adjusting your search parameters"
            height={400}
            action={onClear ? {
                label: "Clear Search",
                onClick: onClear,
                variant: "outline"
            } : undefined}
        />
    );
};

export default DrilldownEmpty;
