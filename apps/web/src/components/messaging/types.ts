export interface ConversationHeader {
  id: string;
  tripId: string;
  tripTitle: string;
  viewer: "TRAVELLER" | "PROVIDER";
  counterparty: { name: string; kind: "PROVIDER" | "TRAVELLER"; slug: string | null };
  bookingId: string | null;
  canSend: boolean;
  contactAllowed: boolean;
}

export interface ConversationSummary extends ConversationHeader {
  unread: number;
  lastMessageAt: string;
  lastMessage: { body: string; mine: boolean; at: string } | null;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
}
