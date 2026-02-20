
import PremiumStateView from '../PremiumStateView';

interface ContainerEmptyStateProps {
    title?: string;
    message?: string;
    height?: string | number;
}

export default function ContainerEmptyState({
    title = "No Data Found",
    message = "Container details not available",
    height = "300px"
}: ContainerEmptyStateProps) {
    return (
        <PremiumStateView
            type="empty"
            title={title}
            description={message}
            height={height}
        />
    );
}
