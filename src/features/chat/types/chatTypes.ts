export type IntentType = 'GET_SHIPMENT' | 'GET_CONTAINER' | 'GET_TRUCK' | 'UNKNOWN';
export type SenderType = 'user' | 'bot';

export interface ParsedIntent {
    intent: IntentType;
    entities: Record<string, string>;
    confidence?: number;
}

export interface ChatMessage {
    id: string;
    role: SenderType;
    content: string;
    timestamp: number;
    artifact?: ChatArtifact;
}

// Discriminator types for rendering different structured Data Cards
export type ChatArtifact =
    | { type: 'shipment'; data: any }
    | { type: 'container'; data: any }
    | { type: 'truck'; data: any }
    | { type: 'error'; data: { message: string } };

export interface ChatState {
    isOpen: boolean;
    isTyping: boolean;
    messages: ChatMessage[];
    toggleChat: () => void;
    setOpen: (open: boolean) => void;
    sendMessage: (text: string) => Promise<void>;
    clearHistory: () => void;
}
