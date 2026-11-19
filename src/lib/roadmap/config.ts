/** Roadmap constants. Client + server safe. */

export const ROADMAP_STATUSES = ["todo", "doing", "done", "blocked"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  todo: "Not started",
  doing: "In progress",
  done: "Done",
  blocked: "Blocked",
};

export const ROADMAP_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export const ROADMAP_SIZES = ["S", "M", "L"] as const;
export const ROADMAP_IMPACTS = ["Low", "Medium", "High"] as const;
