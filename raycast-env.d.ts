/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Platform - Filter tables by platform */
  "defaultPlatform": "all" | "darwin" | "linux" | "windows",
  /** Fleet URL - Your Fleet server URL (e.g., https://fleet.example.com) */
  "fleetUrl"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-tables` command */
  export type SearchTables = ExtensionPreferences & {}
  /** Preferences accessible in the `find-column` command */
  export type FindColumn = ExtensionPreferences & {}
  /** Preferences accessible in the `query-templates` command */
  export type QueryTemplates = ExtensionPreferences & {}
  /** Preferences accessible in the `validate-query` command */
  export type ValidateQuery = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-tables` command */
  export type SearchTables = {}
  /** Arguments passed to the `find-column` command */
  export type FindColumn = {}
  /** Arguments passed to the `query-templates` command */
  export type QueryTemplates = {}
  /** Arguments passed to the `validate-query` command */
  export type ValidateQuery = {}
}

