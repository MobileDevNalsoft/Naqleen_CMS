import React from 'react';

interface ViewCardProps {
    title: string;
    description?: string;
    thumbnail?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    isActive?: boolean;
}

/**
 * ViewCard - A clickable card for the view navigation panel
 * Displays a thumbnail/icon, title, and optional description
 */
const ViewCard: React.FC<ViewCardProps> = ({
    title,
    description,
    thumbnail,
    icon,
    onClick,
    isActive = false,
}) => {
    return (
        <button
            className={`view-card ${isActive ? 'active' : ''}`}
            onClick={onClick}
            type="button"
        >
            <div className="view-card-thumbnail">
                {thumbnail ? (
                    <img src={thumbnail} alt={title} />
                ) : icon ? (
                    icon
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                    </svg>
                )}
            </div>
            <div className="view-card-info">
                <h3 className="view-card-title">{title}</h3>
                {description && (
                    <p className="view-card-description">{description}</p>
                )}
            </div>
            <div className="view-card-arrow">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </div>
        </button>
    );
};

export default ViewCard;
