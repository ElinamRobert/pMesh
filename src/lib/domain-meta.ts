import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

interface MetaEntry {
  label: string;
  variant: BadgeVariant;
}

// ─── Feature status ──────────────────────────────────────────────
export const FEATURE_STATUS: Record<string, MetaEntry> = {
  PROPOSED: { label: "Proposed", variant: "secondary" },
  UNDER_REVIEW: { label: "Under review", variant: "info" },
  APPROVED: { label: "Approved", variant: "success" },
  IN_PROGRESS: { label: "In progress", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  DEFERRED: { label: "Deferred", variant: "warning" },
};

export const FEATURE_STATUS_OPTIONS = Object.entries(FEATURE_STATUS).map(
  ([value, m]) => ({ value, label: m.label })
);

// ─── Feature priority ────────────────────────────────────────────
export const FEATURE_PRIORITY: Record<string, MetaEntry> = {
  CRITICAL: { label: "Critical", variant: "destructive" },
  HIGH: { label: "High", variant: "warning" },
  MEDIUM: { label: "Medium", variant: "secondary" },
  LOW: { label: "Low", variant: "outline" },
  ICEBOX: { label: "Icebox", variant: "outline" },
};

export const FEATURE_PRIORITY_OPTIONS = Object.entries(FEATURE_PRIORITY).map(
  ([value, m]) => ({ value, label: m.label })
);

// ─── Feature source ──────────────────────────────────────────────
export const FEATURE_SOURCE_OPTIONS = [
  { value: "CUSTOMER_REQUEST", label: "Customer request" },
  { value: "INTERNAL", label: "Internal" },
  { value: "MARKET_RESEARCH", label: "Market research" },
  { value: "REGULATORY", label: "Regulatory" },
  { value: "TECHNICAL_DEBT", label: "Technical debt" },
  { value: "COMPETITOR_ANALYSIS", label: "Competitor analysis" },
  { value: "USER_FEEDBACK", label: "User feedback" },
  { value: "SUPPORT_TICKET", label: "Support ticket" },
] as const;

export const FEATURE_SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  FEATURE_SOURCE_OPTIONS.map((s) => [s.value, s.label])
);

// ─── Epic status ─────────────────────────────────────────────────
export const EPIC_STATUS: Record<string, MetaEntry> = {
  BACKLOG: { label: "Backlog", variant: "secondary" },
  PLANNED: { label: "Planned", variant: "info" },
  IN_PROGRESS: { label: "In progress", variant: "info" },
  DONE: { label: "Done", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export const EPIC_STATUS_OPTIONS = Object.entries(EPIC_STATUS).map(
  ([value, m]) => ({ value, label: m.label })
);

// ─── Story status ────────────────────────────────────────────────
export const STORY_STATUS: Record<string, MetaEntry> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  READY: { label: "Ready", variant: "info" },
  IN_PROGRESS: { label: "In progress", variant: "info" },
  IN_REVIEW: { label: "In review", variant: "warning" },
  DONE: { label: "Done", variant: "success" },
  BLOCKED: { label: "Blocked", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

export const STORY_STATUS_OPTIONS = Object.entries(STORY_STATUS).map(
  ([value, m]) => ({ value, label: m.label })
);

export const STORY_TYPE_OPTIONS = [
  { value: "USER_STORY", label: "User story" },
  { value: "BUG", label: "Bug" },
  { value: "TASK", label: "Task" },
  { value: "SPIKE", label: "Spike" },
  { value: "CHORE", label: "Chore" },
] as const;

export const CRITERIA_TYPE_OPTIONS = [
  { value: "FUNCTIONAL", label: "Functional" },
  { value: "NON_FUNCTIONAL", label: "Non-functional" },
  { value: "EDGE_CASE", label: "Edge case" },
  { value: "SECURITY", label: "Security" },
  { value: "PERFORMANCE", label: "Performance" },
] as const;
