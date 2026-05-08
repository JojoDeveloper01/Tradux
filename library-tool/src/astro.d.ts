import type { EdgeTraduxOptions } from "./edge.js";

export function createTraduxFromGlob(options: Omit<EdgeTraduxOptions, "translations"> & {
  files: Record<string, Record<string, unknown> | { default: Record<string, unknown> }>;
}): ReturnType<typeof import("./edge.js").createTradux>;
