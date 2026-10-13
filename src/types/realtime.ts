import { MessageType } from "./desk";

export interface AgentPresence {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  status: "viewing" | "typing";
  typingType?: MessageType;
  draftSnippet?: string;
  joinedAt: string;
  lastActive: string;
}

export interface AgentTypingEvent {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  isTyping: boolean;
  replyType: MessageType;
  ticketId: string;
}
