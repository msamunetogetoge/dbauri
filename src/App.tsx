import {
  Component,
  Switch,
  Match,
  createSignal,
  onCleanup,
  onMount,
  createEffect,
  createUniqueId,
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
  const [tabs, setTabs] = createSignal([
    { id: "1", name: "Query 1", content: "" },
  ]);
  const [activeTab, setActiveTab] = createSignal("1");

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

  const addTab = () => {
    const id = createUniqueId();
    const newTab = {
      id: id,
      name: `Query ${id}`,
      content: "",
    };
    setTabs([...tabs(), newTab]);
    setActiveTab(newTab.id);
  };

  const removeTab = (id: string) => {
    setTabs(tabs().filter((tab) => tab.id !== id));
    if (activeTab() === id && tabs().length > 1) {
      setActiveTab(tabs()[0].id);
    }
  };

  const handleTabClick = (id: string) => {
    setActiveTab(id);
  };

  const handleContentChange = (id: string, content: string) => {
    console.log("handleContentChange");
    setTabs(tabs().map((tab) => (tab.id === id ? { ...tab, content } : tab)));
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
          <div
            class={"tab"}
            style={{
              "background-color": "#ddd",
            }}
          >
            {tabs().map((tab) => (
              <Button
                class={"tab-button"}
                onClick={() => handleTabClick(tab.id)}
                variant={`${
                  activeTab() === tab.id ? "light" : "outline-light"
                }`}
              >
                {tab.name}
                <span onClick={() => removeTab(tab.id)}> x </span>
              </Button>
            ))}
            <Button
              onClick={addTab}
              class={"tab-button"}
              variant={"outline-light"}
            >
              +
            </Button>
          </div>
          <div>
            {tabs().map((tab) => (
              <div
                style={{ display: tab.id === activeTab() ? "block" : "none" }}
              >
                <QueryEditor value={tab.content} />
              </div>
            ))}
          </div>

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
