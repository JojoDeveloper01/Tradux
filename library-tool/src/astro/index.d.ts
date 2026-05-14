import type { EdgeTraduxOptions } from "../edge/index.js";

export function createTraduxFromGlob(options: Omit<EdgeTraduxOptions, "translations"> & {
  files: Record<string, Record<string, unknown> | { default: Record<string, unknown> }>;
}): ReturnType<typeof import("../edge/index.js").createTradux>;
