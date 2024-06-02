import { Component, Show, createSignal, onMount } from "solid-js";
import { Button, Alert } from "solid-bootstrap";
import { invoke } from "@tauri-apps/api/tauri";
import { EditorView, basicSetup } from "codemirror";
import { sql } from "@codemirror/lang-sql";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

interface QueryResult {
  columns: string[];
  rows: string[][];
}

const QueryEditor: Component = () => {
  const [query, setQuery] = createSignal("");
  const [queryError, setQueryError] = createSignal("");
  const [queryResult, setQueryResult] = createSignal<QueryResult>({
    columns: [],
    rows: [],
  });

  let editorContainer: HTMLDivElement | undefined;

  onMount(() => {
    if (editorContainer) {
      const editor = new EditorView({
        doc: query(),
        extensions: [
          basicSetup,
          sql(),
          keymap.of([indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setQuery(update.state.doc.toString());
            }
          }),
        ],
        parent: editorContainer,
      });
    }
  });

  const handleQueryExecute = async () => {
    try {
      const response = await invoke<string>("execute_query", { sql: query() });
      const result = JSON.parse(response) as QueryResult;
      setQueryError("");
      setQueryResult(result);
    } catch (error: any) {
      console.error("Query execution error:", error);
      setQueryError(error.toString());
      setQueryResult({ columns: [], rows: [] });
    }
  };
  return (
    <div>
      {/* <Form.Control
        as="textarea"
        rows={3}
        placeholder="Enter your SQL query here..."
        value={query()}
        onInput={(e) => setQuery(e.currentTarget.value)}
        class="mb-3"
      /> */}
      <div
        ref={editorContainer}
        style={{ border: "1px solid #ccc", height: "200px" }}
      ></div>

      <Button onClick={handleQueryExecute} variant="primary">
        Execute Query
      </Button>
      <div class="mt-3">
        <Show when={queryError() !== ""}>
          <Alert variant={"danger"}>{queryError()}</Alert>
        </Show>
        <Show when={queryResult().rows.length > 0}>
          <table class="table table-striped">
            <thead>
              <tr>
                {queryResult().columns.map((column, idx) => (
                  <th>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResult().rows.map((row, rowIndex) => (
                <tr>
                  {row.map((cell, cellIndex) => (
                    <td>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  );
};

export default QueryEditor;
