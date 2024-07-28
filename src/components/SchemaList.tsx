import { Component, Show, createEffect, createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api";
import { Button, Stack } from "solid-bootstrap";
import TableList from "./TableList";

const SchemaList: Component<{ connectionId: string }> = (props) => {
  const [schemas, setSchemas] = createSignal<string[]>([]);
  const [selectedSchema, setSelectedSchema] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string | null>(null);

  const fetchSchemas = async () => {
    setLoading(true);
    try {
      const response: string[] = await invoke("get_schemas", {
        id: props.connectionId,
      });
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
    // 接続情報のidがあるときだけfetchする
    if (props.connectionId !== "") {
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
        <Show when={error() === null}>
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
        </Show>
        {/*  schemaのリストが正常に取得できた時だけテーブルリストを表示 */}
        <Show when={error() === null && selectedSchema() !== null}>
          <TableList
            schema={selectedSchema()!}
            connectionId={props.connectionId}
          />
        </Show>
      </div>
    </Show>
  );
};

export default SchemaList;
