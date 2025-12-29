export interface OsqueryColumn {
  name: string;
  description: string;
  type: string;
  notes: string;
  hidden: boolean;
  required: boolean;
  index: boolean;
  platforms?: string[];
}

export interface OsqueryTable {
  name: string;
  description: string;
  url: string;
  platforms: string[];
  evented: boolean;
  cacheable: boolean;
  notes: string;
  examples: string[];
  columns: OsqueryColumn[];
}

export type OsquerySchema = OsqueryTable[];

export type Platform = "darwin" | "linux" | "windows" | "all";

export const PLATFORM_LABELS: Record<string, string> = {
  darwin: "macOS",
  linux: "Linux",
  windows: "Windows",
  all: "All",
};

// Icon filenames in assets folder
export const PLATFORM_ICON_FILES: Record<string, string> = {
  darwin: "apple-icon.png",
  linux: "linux-icon.png",
  windows: "windows-icon.svg",
};
