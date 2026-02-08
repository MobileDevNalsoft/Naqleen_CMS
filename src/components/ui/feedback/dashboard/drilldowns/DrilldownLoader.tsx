import React from 'react';
import PremiumStateView from '../../PremiumStateView';

const DrilldownLoader: React.FC = () => {
    return (
        <PremiumStateView
            type="loading"
            title="Retrieving Intelligence..."
            description="Analyzing fleet data metrics"
            height={400}
        />
    );
};

export default DrilldownLoader;
