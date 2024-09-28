import {
  Component,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
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

interface QueryEffectResult {
  message: string;
  rows_affected: string;
}

const QueryEditorHeight = "5rem";

const QueryEditor: Component<{ connectionId?: string; value?: string }> = (
  props
) => {
  const [query, setQuery] = createSignal(props.value || "");
  const [queryError, setQueryError] = createSignal("");
  const [queryResult, setQueryResult] = createSignal<QueryResult>({
    columns: [],
    rows: [],
  });
  const [showQuertyEditor, setShowQueryEditor] = createSignal(true);
  const [queryEditorHeight, setQueryEditorHeight] =
    createSignal<string>(QueryEditorHeight);

  // windowの幅・高さを保持
  const [windowWidth, setWindowWidth] = createSignal(window.innerWidth);
  const [windowHeight, setWindowHeight] = createSignal(window.innerHeight);

  const updateWindowWidth = () => {
    setWindowWidth(window.innerWidth);
  };

  const updateWindowHeight = () => {
    setWindowHeight(window.innerHeight);
  };

  // ウィンドウの大きさが変わったら、query resultの大きさを再計算させる
  window.addEventListener("resize", updateWindowWidth);
  window.addEventListener("resize", updateWindowHeight);

  // お掃除
  onCleanup(() => {
    window.removeEventListener("resize", updateWindowWidth);
    window.removeEventListener("resize", updateWindowHeight);
  });

  // query resultの幅を計算する
  const maxQueryResultWidth = createMemo(() => {
    return (windowWidth() - 12 * 16) / 16;
  }, windowWidth());
  // query resultの高さを計算する
  const maxQueryResultHeight = createMemo(() => {
    return (windowHeight() - 23 * 16) / 16;
  }, windowHeight());

  let editor: EditorView | undefined;
  let editorContainer: HTMLDivElement | undefined;

  let isResizing = false;
  let startY: number;
  let startHeight: number;

  // リサイズの処理
  const onMouseDown = (e: MouseEvent) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = parseInt(queryEditorHeight());
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // リサイズの処理
  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newHeight = startHeight + e.clientY - startY;
    setQueryEditorHeight(`${newHeight}px`);
  };

  // リサイズの処理
  const onMouseUp = () => {
    isResizing = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  onMount(() => {
    // タブを変更して戻ってきたときのための処理
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
      const response = await invoke<string>("execute_query", {
        id: props.connectionId,
        sql: query(),
      });
      if (query().toUpperCase().startsWith("SELECT")) {
        const result = JSON.parse(response) as QueryResult;
        setQueryError("");
        setQueryResult(result);
      } else {
        const result = JSON.parse(response) as QueryEffectResult;
        setQueryError("");
        alert(`${result.message}, rows_affected:${result.rows_affected}`);
      }
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
      <Show when={showQuertyEditor()}>
        <div style={{ position: "relative", border: "1px solid #ccc" }}>
          <div
            ref={editorContainer}
            style={{
              // border: "1px solid #ccc",
              flex: "0 1 auto",
              overflow: "auto",
              "min-height": QueryEditorHeight,
              height: queryEditorHeight(),
            }}
          ></div>
          <div
            style={{
              // position: "absolute",
              height: "1rem",
              // bottom: "0",
              width: "100%",
              "text-align": "center",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="currentColor"
              class="bi bi-grip-horizontal"
              viewBox="0 0 16 16"
              onMouseDown={onMouseDown}
              onDblClick={() => setQueryEditorHeight(QueryEditorHeight)}
              style={{ cursor: "ns-resize" }}
            >
              <path d="M2 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
          </div>
        </div>
      </Show>

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
        <div
          style={{
            overflow: "auto",
            "max-height": `${maxQueryResultHeight()}rem`,
            "max-width": `${maxQueryResultWidth()}rem`,
          }}
        >
          <Table striped bordered hover class="mt-3">
            <thead class="sticky-top">
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
