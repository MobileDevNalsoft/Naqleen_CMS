
import PremiumStateView from '../PremiumStateView';

interface ContainerErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    height?: string | number;
}

export default function ContainerErrorState({
    title = "Unable to Load",
    message = "Failed to load container details",
    onRetry,
    height = "300px"
}: ContainerErrorStateProps) {
    return (
        <PremiumStateView
            type="error"
            title={title}
            description={message}
            action={onRetry ? { label: "Retry", onClick: onRetry } : undefined}
            height={height}
        />
    );
}
