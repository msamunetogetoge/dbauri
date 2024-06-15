import { Component, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Container } from "solid-bootstrap";
import ConnectionForm from "./components/ConnectionForm";
import QueryEditor from "./components/QueryEditor";
import { listen } from "@tauri-apps/api/event";

const App: Component = () => {
  const [currentDbName, setCurrentDbName] = createSignal<string>("");
  const [connectionStatus, setConnectionStatus] =
    createSignal<string>("disconnected");

  onMount(() => {
    const unlisten = listen<string>("database-connection-status", (event) => {
      setConnectionStatus(event.payload);
    });

    onCleanup(() => {
      unlisten.then((f) => f());
    });
  });
  return (
    <>
      <nav class="navbar navbar-expand-lg navbar-light d-flex justify-content-between sticky-top p-0">
        <div class="navbar-brand">DBauri</div>

        <div class="d-flex align-items-center connection-info">
          <Show when={connectionStatus() !== "disconnected"}>
            <div class="me-2">接続中: {currentDbName()}</div>
          </Show>
          <ConnectionForm setCurrentDbName={setCurrentDbName} />
        </div>
      </nav>

      <main class="d-flex">
        {/* <SchemaList /> */}
        <Container fluid class="content">
          <QueryEditor />

          {/* <Row>
            <Col md={12}>
              <TableDetails />
            </Col>
          </Row> */}
        </Container>
      </main>
    </>
  );
};

export default App;
