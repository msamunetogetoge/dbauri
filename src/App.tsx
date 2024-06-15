import {
  Component,
  Switch,
  Match,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { Button, Container } from "solid-bootstrap";
import ConnectionForm from "./components/ConnectionForm";
import QueryEditor from "./components/QueryEditor";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api";

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

  const handleDisconnect = async () => {
    try {
      await invoke<string>("disconnect_from_database");
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };
  return (
    <>
      <nav class="navbar navbar-expand-lg navbar-light d-flex justify-content-between sticky-top p-0">
        <div class="navbar-brand">DBauri</div>

        <div class="d-flex align-items-center connection-info gap-2">
          <Switch>
            <Match when={connectionStatus() === "disconnected"}>
              <div class="me-2">接続なし</div>
            </Match>
            <Match when={connectionStatus() === "connected"}>
              <div class="me-2">接続中: {currentDbName()}</div>
            </Match>
          </Switch>

          <ConnectionForm setCurrentDbName={setCurrentDbName} />
          <Button onClick={handleDisconnect} variant="secondary" class="ml-2">
            Disconnect
          </Button>
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
