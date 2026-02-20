import { AlertCircle } from 'lucide-react';
import PremiumStateView from '../PremiumStateView';

interface GenericErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    height?: string;
}

export default function GenericErrorState({
    title = "Something went wrong",
    message = "We couldn't load the data. Please try again.",
    onRetry,
    height = '300px'
}: GenericErrorStateProps) {
    return (
        <PremiumStateView
            type="error"
            title={title}
            description={message}
            icon={AlertCircle}
            action={onRetry ? { label: "Retry", onClick: onRetry } : undefined}
            height={height}
        />
    );
}
