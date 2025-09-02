export type SuggestedItems = {
  sessionId: string;
  items: Array<{ productId: string; name: string; quantity: number; reason: string }>;
};
