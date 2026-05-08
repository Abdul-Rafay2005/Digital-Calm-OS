export type PriorityLabel =
  | "Critical"
  | "Important"
  | "Medium"
  | "Low Priority"
  | "Distraction";

export type AIBriefing = {
  headline: string;
  narrative: string;
  highlights: string[];
  recommendations: string[];
  focusPlan: string[];
  riskLevel: PriorityLabel;
  generatedBy: "Gemini" | "Local";
};
