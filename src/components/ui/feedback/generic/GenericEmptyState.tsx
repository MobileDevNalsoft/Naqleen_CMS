import { type LucideIcon, FileX, SearchX, Box } from 'lucide-react';
import PremiumStateView from '../PremiumStateView';

interface GenericEmptyStateProps {
    title?: string;
    description?: string;
    icon?: LucideIcon;
    action?: {
        label: string;
        onClick: () => void;
    };
    height?: string;
    type?: 'data' | 'search' | 'default';
}

export default function GenericEmptyState({
    title,
    description,
    icon,
    action,
    height = '300px',
    type = 'default'
}: GenericEmptyStateProps) {

    // Determine defaults based on type
    const getDefaults = () => {
        switch (type) {
            case 'search':
                return {
                    title: title || 'No Results Found',
                    description: description || 'Try adjusting your search or filters',
                    icon: icon || SearchX
                };
            case 'data':
                return {
                    title: title || 'No Data Available',
                    description: description || 'There are no records to display at this time',
                    icon: icon || FileX
                };
            default:
                return {
                    title: title || 'Nothing Here',
                    description: description || 'This section is empty',
                    icon: icon || Box
                };
        }
    };

    const defaults = getDefaults();

    return (
        <PremiumStateView
            type="empty"
            title={defaults.title}
            description={defaults.description}
            icon={defaults.icon}
            action={action}
            height={height}
        />
    );
}
