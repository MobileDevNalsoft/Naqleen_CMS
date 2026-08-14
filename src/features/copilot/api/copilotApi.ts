import axios from 'axios';

const COPILOT_BASE_URL = 'http://localhost:9000';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CopilotArtifact {
  title: string;
  html: string;
}

export interface CopilotResponse {
  response: string;
  artifact: CopilotArtifact | null;
  tools_used: string[];
  location_id: number;
  conversation_id: string;
}

export const sendCopilotMessage = async (
  message: string,
  history: CopilotMessage[],
  locationId: number
): Promise<CopilotResponse> => {
  const { data } = await axios.post<CopilotResponse>(`${COPILOT_BASE_URL}/chat`, {
    message,
    history,
    location_id: locationId,
  }, { timeout: 300_000 }); // 5min timeout — local LLM is slow
  return data;
};
