import {
  Component,
  Switch,
  Match,
  createSignal,
  onCleanup,
  onMount,
  createEffect,
} from "solid-js";
import { Button, Container } from "solid-bootstrap";
import ConnectionForm from "./components/ConnectionForm";
import QueryEditor from "./components/QueryEditor";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api";
import SideBar from "./components/SideBar";
import {
  ConnectionMode,
  ConnectionProvider,
  useConnection,
} from "./context/ConnectionContext";

const App: Component = () => {
  const [currentDbName, setCurrentDbName] = createSignal<string>("");

  return (
    <ConnectionProvider>
      <AppContent
        currentDbName={currentDbName}
        setCurrentDbName={setCurrentDbName}
      />
    </ConnectionProvider>
  );
};

const AppContent: Component<{
  currentDbName: () => string;
  setCurrentDbName: (name: string) => void;
}> = (props) => {
  const [currentDbName, setCurrentDbName] = createSignal<string>("");
  const { connectionStatus, setConnectionStatus } = useConnection();

  onMount(() => {
    const unlisten = listen<ConnectionMode>(
      "database-connection-status",
      (event) => {
        console.log("database-connection-status", event.payload);
        setConnectionStatus(event.payload);
      }
    );

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
        <SideBar />

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
