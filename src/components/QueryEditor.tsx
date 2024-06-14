import { Component, Show, createEffect, createSignal, onMount } from "solid-js";
import { Button, Alert, Table } from "solid-bootstrap";
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
  const [showQuertyEditor, setShowQueryEditor] = createSignal(true);

  let editor: EditorView | undefined;
  let editorContainer: HTMLDivElement | undefined;

  onMount(() => {
    if (editorContainer) {
      editor = new EditorView({
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

  const toggleEditorVisibility = () => {
    if (showQuertyEditor()) {
      editor = undefined;
    }
    setShowQueryEditor(!showQuertyEditor());
  };

  createEffect(() => {
    if (showQuertyEditor() && editorContainer && !editor) {
      // エディターを再度開いたときに内容を復元
      editor = new EditorView({
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

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        "flex-direction": "column",
        gap: "1rem",
      }}
    >
      <Button
        onClick={toggleEditorVisibility}
        variant="secondary"
        style={{ "align-self": "flex-start" }}
      >
        {showQuertyEditor() ? "Hide Editor" : "Show Editor"}
      </Button>

      <div
        ref={editorContainer}
        style={{
          border: "1px solid #ccc",
          flex: "0 1 auto",
          overflow: "auto",
        }}
      >
        <Show when={showQuertyEditor()}> </Show>
      </div>

      <Button
        onClick={handleQueryExecute}
        variant="primary"
        class="mt-3"
        style={{ "max-width": "10rem", "align-self": "flex-start" }}
      >
        Execute Query
      </Button>

      <Show when={queryError() !== ""}>
        <Alert variant={"danger"}>{queryError()}</Alert>
      </Show>
      <Show when={queryResult().rows.length > 0}>
        <div style={{ flex: "0 1 auto", overflow: "auto" }}>
          <Table striped bordered hover class="mt-3">
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
          </Table>
        </div>
      </Show>
    </div>
  );
};

export default QueryEditor;
