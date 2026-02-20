import React from 'react';
import PremiumStateView from '../../PremiumStateView';

interface DrilldownErrorProps {
    message?: string;
    onRetry: () => void;
}

const DrilldownError: React.FC<DrilldownErrorProps> = ({ message, onRetry }) => {
    return (
        <PremiumStateView
            type="error"
            title="Execution Error"
            description={message || "Failed to load drilldown data"}
            height={400}
            action={{
                label: "Retry Operation",
                onClick: onRetry,
                variant: "primary"
            }}
        />
    );
};

export default DrilldownError;
