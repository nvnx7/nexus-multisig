export type VaultStep =
  | "configure"
  | "submitting_r1"
  | "waiting_r1"
  | "submitting_r2"
  | "waiting_r2"
  | "finalizing"
  | "complete"
  | "error";
