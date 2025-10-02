// Shared domain types for Diagnostik-chat Pilot-MVP
// These will evolve in later milestones (M3/M4) but we start minimal in M1.

export type Speaker = "user" | "ai";

export interface Interview {
  id: string;
  sessionId: string;
  customerName?: string;
  company?: string;
  consentAt?: string; // ISO string
  startedAt: string;  // ISO string
  endedAt?: string;   // ISO string
  status: "created" | "active" | "ended" | "deleted";
}

export interface Turn {
  id: string;
  interviewId: string;
  speaker: Speaker;
  text: string;
  startedAt: string;
  endedAt?: string;
  audioUrl?: string | null;
}

export interface Finding {
  id: string;
  interviewId: string;
  symptom: string;
  why_chain?: string[]; // represents 5-why chain
  root_cause?: string;
  consequence?: string;
  tier?: 1 | 2 | 3 | 4;
}
