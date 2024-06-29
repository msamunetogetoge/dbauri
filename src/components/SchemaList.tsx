import {
  Component,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { invoke } from "@tauri-apps/api";
import { Button, Stack } from "solid-bootstrap";
import TableList from "./TableList";
import { useConnection } from "../context/ConnectionContext";

const SchemaList: Component = () => {
  const [schemas, setSchemas] = createSignal<string[]>([]);
  const [selectedSchema, setSelectedSchema] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string | null>(null);
  const { connectionStatus } = useConnection();

  const fetchSchemas = async () => {
    setLoading(true);
    try {
      const response: string[] = await invoke("get_schemas");
      setSchemas(response);
      setError(null);
    } catch (err) {
      setError("Failed to fetch schemas.");
      console.error("Error fetching schemas:", err);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (connectionStatus() === "connected") {
      fetchSchemas();
    } else {
      setSchemas([]);
      setSelectedSchema(null);
    }
  });

  return (
    <Show when={schemas().length > 0}>
      <div class="schema-list" style={{ "max-height": "100%" }}>
        <h4>Schemas</h4>
        {loading() && <p>Loading...</p>}
        {error() && <p class="error">{error()}</p>}
        <Stack style={{ "max-height": "20rem", "overflow-y": "auto" }}>
          {schemas().map((schema) => (
            <Button
              variant="link"
              class="px-0"
              style={{ "overflow-wrap": "break-word", "text-align": "left" }}
              onClick={() => setSelectedSchema(schema)}
            >
              {schema}
            </Button>
          ))}
        </Stack>
        <Show when={selectedSchema() !== null}>
          <TableList schema={selectedSchema()!} />
        </Show>
      </div>
    </Show>
  );
};

export default SchemaList;
