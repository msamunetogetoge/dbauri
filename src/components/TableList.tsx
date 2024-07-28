import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { invoke } from "@tauri-apps/api";
import { Button, NavLink, Stack } from "solid-bootstrap";
import TableDetails from "./TableDetails";

interface TableListProps {
  schema: string;
  connectionId: string;
}

const TableList: Component<TableListProps> = (props) => {
  const [tables, setTables] = createSignal<string[]>([]);
  const [selectedTable, setSelectedTable] = createSignal<string | null>(null);

  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string | null>(null);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response: string[] = await invoke("get_tables", {
        id: props.connectionId,
        schema: props.schema,
      });
      setTables(response);
      setError(null);
    } catch (err) {
      setError("Failed to fetch tables.");
      console.error("Error fetching tables:", err);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchTables();
  });

  return (
    <div class="table-list" style={{ "max-height": "100%" }}>
      <h4 style={{ "overflow-wrap": "break-word" }}>
        Tables in {props.schema}
      </h4>
      {loading() && <p>Loading tables...</p>}
      {error() && <p class="error">{error()}</p>}
      <Stack style={{ "max-height": "55rem", "overflow-y": "auto" }}>
        {tables().map((table) => (
          <Button
            variant="secondary"
            class="px-1 my-1"
            style={{ "overflow-wrap": "break-word", "text-align": "left" }}
            onClick={() => setSelectedTable(table)}
          >
            {table}
          </Button>
        ))}
      </Stack>
      {selectedTable() && (
        <TableDetails
          connectionId={props.connectionId}
          schema={props.schema}
          table={selectedTable()!}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
};

export default TableList;
