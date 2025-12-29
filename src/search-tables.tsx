import {
  Action,
  ActionPanel,
  List,
  Form,
  getPreferenceValues,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
} from "@raycast/api";
import { useState, useMemo, useCallback } from "react";
import { getSchema, filterByPlatform, searchTables } from "./schema/loader";
import { OsqueryTable, OsqueryColumn, Platform, PLATFORM_ICON_FILES } from "./schema/types";
import { TableCategory, CATEGORY_INFO, filterByCategory, getTableCategory } from "./schema/categories";

interface Preferences {
  defaultPlatform: Platform;
}

type SearchMode = "tables" | "columns";

interface FlatColumn {
  column: OsqueryColumn;
  table: OsqueryTable;
}

function getPlatformAccessories(platforms: string[]): List.Item.Accessory[] {
  return platforms.map((p) => ({
    icon: PLATFORM_ICON_FILES[p] || undefined,
    tooltip: p === "darwin" ? "macOS" : p === "linux" ? "Linux" : p === "windows" ? "Windows" : p,
  })).filter((a) => a.icon);
}

function getRequiredColumns(table: OsqueryTable): string[] {
  return table.columns.filter((c) => c.required).map((c) => c.name);
}

function TableDetail({ table }: { table: OsqueryTable }) {
  const requiredCols = getRequiredColumns(table);
  const category = getTableCategory(table);
  const categoryInfo = CATEGORY_INFO[category];
  const visibleColumns = table.columns.filter((c) => !c.hidden);

  // Color for column types
  const typeColor = (type: string): Color => {
    switch (type.toUpperCase()) {
      case "INTEGER":
      case "BIGINT":
        return Color.Blue;
      case "TEXT":
        return Color.Green;
      case "DOUBLE":
        return Color.Purple;
      default:
        return Color.SecondaryText;
    }
  };

  // Platform colors
  const platformColor = (p: string): Color => {
    switch (p) {
      case "darwin": return Color.Purple;
      case "linux": return Color.Orange;
      case "windows": return Color.Blue;
      default: return Color.SecondaryText;
    }
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Table">
            <List.Item.Detail.Metadata.TagList.Item text={table.name} color={Color.PrimaryText} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="" text={table.description} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Category">
            <List.Item.Detail.Metadata.TagList.Item text={categoryInfo.label} color={categoryInfo.color} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Platforms">
            {table.platforms.map((p) => (
              <List.Item.Detail.Metadata.TagList.Item key={p} text={p} color={platformColor(p)} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          {requiredCols.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Required WHERE">
              {requiredCols.map((col) => (
                <List.Item.Detail.Metadata.TagList.Item key={col} text={col} color={Color.Red} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {table.evented && (
            <List.Item.Detail.Metadata.TagList title="Evented">
              <List.Item.Detail.Metadata.TagList.Item text="Yes" color={Color.Orange} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Link title="Docs" text="osquery.io" target={`https://osquery.io/schema/#${table.name}`} />
          <List.Item.Detail.Metadata.Link title="Specs" text="GitHub" target={table.url} />
          <List.Item.Detail.Metadata.Separator />
          {visibleColumns.map((col) => (
            <List.Item.Detail.Metadata.TagList key={col.name} title={col.name}>
              <List.Item.Detail.Metadata.TagList.Item text={col.type} color={typeColor(col.type)} />
              {col.required && <List.Item.Detail.Metadata.TagList.Item text="required" color={Color.Red} />}
            </List.Item.Detail.Metadata.TagList>
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Multi-column query builder form
function ColumnSelectQueryBuilder({ table }: { table: OsqueryTable }) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereValues, setWhereValues] = useState<Record<string, string>>({});

  const availableColumns = useMemo(
    () => table.columns.filter((c) => !c.hidden),
    [table]
  );

  const requiredCols = useMemo(() => getRequiredColumns(table), [table]);

  const generatedQuery = useMemo(() => {
    const cols = selectedColumns.length > 0 ? selectedColumns.join(",\n       ") : "*";
    let query = `SELECT ${cols}\nFROM ${table.name}`;

    if (requiredCols.length > 0) {
      const whereClauses = requiredCols.map((col) => {
        const value = whereValues[col] || "<value>";
        return `${col} = '${value}'`;
      });
      query += `\nWHERE ${whereClauses.join("\n  AND ")}`;
    }

    return query + ";";
  }, [selectedColumns, table, requiredCols, whereValues]);

  async function handleSubmit() {
    await Clipboard.copy(generatedQuery);
    await showToast({ style: Toast.Style.Success, title: "Query copied!" });
    await popToRoot();
  }

  return (
    <Form
      navigationTitle={`Build Query: ${table.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Query" onSubmit={handleSubmit} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    >
      <Form.Description title="Table" text={table.name} />

      {table.evented && (
        <Form.Description
          title="Evented"
          text="This table subscribes to OS events and may be empty if events are disabled."
        />
      )}

      <Form.TagPicker
        id="columns"
        title="Select Columns"
        value={selectedColumns}
        onChange={setSelectedColumns}
      >
        {availableColumns.map((col) => (
          <Form.TagPicker.Item
            key={col.name}
            title={`${col.name} (${col.type})`}
            value={col.name}
          />
        ))}
      </Form.TagPicker>

      {requiredCols.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description title="Required WHERE" text="These columns require values" />
          {requiredCols.map((colName) => {
            const col = table.columns.find((c) => c.name === colName);
            return (
              <Form.TextField
                key={colName}
                id={colName}
                title={colName}
                placeholder={col?.type === "INTEGER" || col?.type === "BIGINT" ? "e.g. 123" : "e.g. value"}
                info={col?.description || ""}
                value={whereValues[colName] || ""}
                onChange={(value) => setWhereValues((prev) => ({ ...prev, [colName]: value }))}
              />
            );
          })}
        </>
      )}

      <Form.Separator />
      <Form.Description title="Preview" text={generatedQuery} />
    </Form>
  );
}

function findTablesWithColumn(columnName: string, tables: OsqueryTable[]): OsqueryTable[] {
  return tables.filter((t) =>
    t.columns.some((c) => c.name.toLowerCase() === columnName.toLowerCase() && !c.hidden)
  );
}

// Table picker when column exists in multiple tables
function RelatedTablesPicker({
  columnName,
  tables,
}: {
  columnName: string;
  tables: OsqueryTable[];
}) {
  return (
    <List navigationTitle={`"${columnName}" in ${tables.length} tables`}>
      {tables.map((table) => {
        const requiredCols = getRequiredColumns(table);
        const hasRequired = requiredCols.length > 0;
        const category = getTableCategory(table);
        const categoryInfo = CATEGORY_INFO[category];

        return (
          <List.Item
            key={table.name}
            title={table.name}
            subtitle={table.description}
            accessories={[
              { tag: { value: categoryInfo.label, color: categoryInfo.color } },
              ...getPlatformAccessories(table.platforms),
              ...(hasRequired ? [{ tag: { value: "WHERE", color: Color.Red } }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigate">
                  <Action.Push
                    title="View Table"
                    icon={Icon.Eye}
                    target={<TableView table={table} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Query">
                  <Action.Push
                    title="Build Custom Query"
                    icon="osquery.svg"
                    target={<ColumnSelectQueryBuilder table={table} />}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy SELECT Query"
                    content={`SELECT ${columnName} FROM ${table.name};`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Docs">
                  <Action.OpenInBrowser
                    title="Open Docs"
                    url={`https://osquery.io/schema/#${table.name}`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Specs"
                    url={table.url}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// Standalone table view for navigation from column mode
function TableView({ table }: { table: OsqueryTable }) {
  const requiredCols = getRequiredColumns(table);
  const hasRequired = requiredCols.length > 0;
  const category = getTableCategory(table);
  const categoryInfo = CATEGORY_INFO[category];

  const buildSelectQuery = () => {
    let query = `SELECT * FROM ${table.name}`;
    if (hasRequired) {
      query += `\nWHERE ${requiredCols.map((col) => `${col} = '<value>'`).join(" AND ")}`;
    }
    return query + ";";
  };

  const buildColumnsQuery = () => {
    const cols = table.columns.filter((c) => !c.hidden).map((c) => c.name).join(", ");
    let query = `SELECT ${cols} FROM ${table.name}`;
    if (hasRequired) {
      query += `\nWHERE ${requiredCols.map((col) => `${col} = '<value>'`).join(" AND ")}`;
    }
    return query + ";";
  };

  return (
    <List isShowingDetail navigationTitle={table.name}>
      <List.Item
        title={table.name}
        subtitle={`${categoryInfo.label} • ${table.columns.length} columns`}
        accessories={[
          ...getPlatformAccessories(table.platforms),
          ...(hasRequired ? [{ tag: { value: "WHERE", color: Color.Red } }] : []),
          ...(table.evented ? [{ tag: { value: "EVENT", color: Color.Orange } }] : []),
        ]}
        detail={<TableDetail table={table} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Query">
              <Action.Push
                title="Build Custom Query"
                icon="osquery.svg"
                target={<ColumnSelectQueryBuilder table={table} />}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action.CopyToClipboard
                title="Copy SELECT * Query"
                content={buildSelectQuery()}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy All Columns Query"
                content={buildColumnsQuery()}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard title="Copy Table Name" content={table.name} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Docs">
              <Action.OpenInBrowser
                title="Open Docs"
                url={`https://osquery.io/schema/#${table.name}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.OpenInBrowser
                title="Open Specs"
                url={table.url}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />

      <List.Section title="Columns">
        {table.columns
          .filter((c) => !c.hidden)
          .map((col) => (
            <List.Item
              key={col.name}
              title={col.name}
              subtitle={col.description}
              accessories={[
                { tag: col.type },
                ...(col.required ? [{ tag: { value: "required", color: Color.Red } }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Column Name"
                    content={col.name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy SELECT Query"
                    content={`SELECT ${col.name} FROM ${table.name};`}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function ColumnDetail({
  flatColumn,
  relatedTables,
}: {
  flatColumn: FlatColumn;
  relatedTables: OsqueryTable[];
}) {
  const { column, table } = flatColumn;

  const typeColor = (type: string): Color => {
    switch (type.toUpperCase()) {
      case "INTEGER":
      case "BIGINT":
        return Color.Blue;
      case "TEXT":
        return Color.Green;
      case "DOUBLE":
        return Color.Purple;
      default:
        return Color.SecondaryText;
    }
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Column">
            <List.Item.Detail.Metadata.TagList.Item text={column.name} color={Color.PrimaryText} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item text={column.type} color={typeColor(column.type)} />
            {column.required && <List.Item.Detail.Metadata.TagList.Item text="required" color={Color.Red} />}
          </List.Item.Detail.Metadata.TagList>
          {column.description && (
            <List.Item.Detail.Metadata.Label title="" text={column.description} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Current Table" text={table.name} />
          <List.Item.Detail.Metadata.Label title="Found In" text={`${relatedTables.length} table${relatedTables.length > 1 ? "s" : ""}`} />
          {relatedTables.length > 1 && (
            <List.Item.Detail.Metadata.TagList title="Tables">
              {relatedTables.slice(0, 5).map((t) => (
                <List.Item.Detail.Metadata.TagList.Item key={t.name} text={t.name} color={Color.SecondaryText} />
              ))}
              {relatedTables.length > 5 && (
                <List.Item.Detail.Metadata.TagList.Item text={`+${relatedTables.length - 5} more`} color={Color.SecondaryText} />
              )}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function SearchTables() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [platform, setPlatform] = useState<Platform>(preferences.defaultPlatform || "darwin");
  const [category, setCategory] = useState<TableCategory>("all");
  const [searchMode, setSearchMode] = useState<SearchMode>("tables");

  const allTables = useMemo(() => getSchema(), []);

  const filteredTables = useMemo(() => {
    let tables = filterByPlatform(allTables, platform);
    tables = filterByCategory(tables, category);
    return searchTables(tables, searchText);
  }, [allTables, platform, category, searchText]);

  // Flatten columns for column search mode
  const flatColumns = useMemo<FlatColumn[]>(() => {
    const columns: FlatColumn[] = [];
    for (const table of filteredTables) {
      for (const column of table.columns) {
        if (!column.hidden) {
          columns.push({ column, table });
        }
      }
    }

    // Filter by search text in column mode
    if (searchText && searchMode === "columns") {
      const lowerSearch = searchText.toLowerCase();
      return columns.filter(
        (fc) =>
          fc.column.name.toLowerCase().includes(lowerSearch) ||
          fc.column.description.toLowerCase().includes(lowerSearch)
      );
    }

    return columns;
  }, [filteredTables, searchText, searchMode]);

  return (
    <List
      isShowingDetail
      searchBarPlaceholder={
        searchMode === "tables"
          ? "Search tables, columns, or descriptions..."
          : "Search columns across all tables..."
      }
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filters"
          onChange={(value) => {
            // Parse composite value: mode:platform:category
            if (value.startsWith("mode:")) {
              setSearchMode(value.replace("mode:", "") as SearchMode);
            } else if (value.startsWith("platform:")) {
              setPlatform(value.replace("platform:", "") as Platform);
            } else if (value.startsWith("category:")) {
              setCategory(value.replace("category:", "") as TableCategory);
            }
          }}
        >
          <List.Dropdown.Section title="Search Mode">
            <List.Dropdown.Item
              title={searchMode === "tables" ? "✓ Search Tables" : "Search Tables"}
              value="mode:tables"
            />
            <List.Dropdown.Item
              title={searchMode === "columns" ? "✓ Search Columns" : "Search Columns"}
              value="mode:columns"
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Platform">
            {(["all", "darwin", "linux", "windows"] as Platform[]).map((p) => (
              <List.Dropdown.Item
                key={p}
                title={`${platform === p ? "✓ " : ""}${p === "all" ? "All Platforms" : p === "darwin" ? "macOS" : p === "linux" ? "Linux" : "Windows"}`}
                value={`platform:${p}`}
                icon={p !== "all" ? PLATFORM_ICON_FILES[p] : undefined}
              />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Category">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <List.Dropdown.Item
                key={key}
                title={`${category === key ? "✓ " : ""}${info.label}`}
                value={`category:${key}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {searchMode === "tables" ? (
        // TABLE MODE
        filteredTables.map((table) => {
          const requiredCols = getRequiredColumns(table);
          const hasRequired = requiredCols.length > 0;
          const tableCategory = getTableCategory(table);
          const categoryInfo = CATEGORY_INFO[tableCategory];

          const buildSelectQuery = () => {
            let query = `SELECT * FROM ${table.name}`;
            if (hasRequired) {
              const whereClauses = requiredCols.map((col) => `${col} = '<value>'`);
              query += `\nWHERE ${whereClauses.join(" AND ")}`;
            }
            return query + ";";
          };

          const buildColumnsQuery = () => {
            const cols = table.columns
              .filter((c) => !c.hidden)
              .map((c) => c.name)
              .join(", ");
            let query = `SELECT ${cols} FROM ${table.name}`;
            if (hasRequired) {
              const whereClauses = requiredCols.map((col) => `${col} = '<value>'`);
              query += `\nWHERE ${whereClauses.join(" AND ")}`;
            }
            return query + ";";
          };

          return (
            <List.Item
              key={table.name}
              title={table.name}
              keywords={[table.description, ...table.columns.map((c) => c.name), tableCategory]}
              accessories={[
                ...(hasRequired ? [{ tag: { value: "WHERE", color: Color.Red } }] : []),
                ...(table.evented ? [{ tag: { value: "EVENT", color: Color.Orange } }] : []),
                ...getPlatformAccessories(table.platforms),
              ]}
              detail={<TableDetail table={table} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Query">
                    <Action.Push
                      title="Build Custom Query"
                      icon={Icon.Hammer}
                      target={<ColumnSelectQueryBuilder table={table} />}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                    <Action.CopyToClipboard
                      title={hasRequired ? "Copy SELECT * Query (with WHERE)" : "Copy SELECT * Query"}
                      content={buildSelectQuery()}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title={hasRequired ? "Copy All Columns Query (with WHERE)" : "Copy All Columns Query"}
                      content={buildColumnsQuery()}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.CopyToClipboard title="Copy Table Name" content={table.name} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Docs">
                    <Action.OpenInBrowser
                      title="Open Docs"
                      url={`https://osquery.io/schema/#${table.name}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.OpenInBrowser
                      title="Open Specs"
                      url={table.url}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        // COLUMN MODE
        flatColumns.map((fc, index) => {
          const { column, table } = fc;
          const relatedTables = findTablesWithColumn(column.name, filteredTables);
          const otherTables = relatedTables.filter((t) => t.name !== table.name);

          return (
            <List.Item
              key={`${table.name}.${column.name}.${index}`}
              title={column.name}
              subtitle={table.name}
              accessories={[
                { tag: column.type },
                ...(column.required ? [{ tag: { value: "req", color: Color.Red } }] : []),
                ...(relatedTables.length > 1
                  ? [{ text: `${relatedTables.length}` }]
                  : []),
              ]}
              detail={<ColumnDetail flatColumn={fc} relatedTables={relatedTables} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Navigate">
                    {relatedTables.length > 1 ? (
                      <Action.Push
                        title={`Browse ${relatedTables.length} Tables`}
                        icon={Icon.List}
                        target={
                          <RelatedTablesPicker
                            columnName={column.name}
                            tables={relatedTables}
                          />
                        }
                      />
                    ) : (
                      <Action.Push
                        title={`View ${table.name}`}
                        icon={Icon.Eye}
                        target={<TableView table={table} />}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Query">
                    <Action.Push
                      title="Build Custom Query"
                      icon={Icon.Hammer}
                      target={<ColumnSelectQueryBuilder table={table} />}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Column Name"
                      content={column.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy SELECT Query"
                      content={`SELECT ${column.name} FROM ${table.name};`}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Docs">
                    <Action.OpenInBrowser
                      title="Open Docs"
                      url={`https://osquery.io/schema/#${table.name}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.OpenInBrowser
                      title="Open Specs"
                      url={table.url}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
