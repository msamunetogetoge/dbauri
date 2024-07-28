import {
  Component,
  Switch,
  Match,
  createSignal,
  onCleanup,
  onMount,
  createUniqueId,
  createMemo,
} from "solid-js";
import { Button, Container } from "solid-bootstrap";
import ConnectionForm from "./components/ConnectionForm";
import QueryEditor from "./components/QueryEditor";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api";
import SideBar from "./components/SideBar";
import {
  ConnectionStatus,
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
    { id: createUniqueId(), name: "Query 1", content: "", connectionId: "" },
  ]);
  const [activeTab, setActiveTab] = createSignal(tabs()[0].id);

  onMount(() => {
    const unlisten = listen<ConnectionStatus>(
      "database-connection-status",
      (event) => {
        console.debug("database-connection-status", event.payload);
        setConnectionStatus((prevStatus) => {
          const newStatus = prevStatus.filter(
            (status) => status.id !== event.payload.id
          );
          newStatus.push(event.payload);
          return newStatus;
        });
      }
    );

    // Listen for custom event to disconnect all connections
    const unlistenDisconnect = listen(
      "disconnect-all-connections",
      async () => {
        const connections = connectionStatus();
        for (const connection of connections) {
          if (connection.status === "connected") {
            await invoke("disconnect_all_connections");
          }
        }
      }
    );

    // Cleanup function to run when the component is unmounted
    onCleanup(async () => {
      // Unlisten to the event listener
      unlisten.then((f) => f());
      unlistenDisconnect.then((f) => f());

      // Disconnect all connections
      const connections = connectionStatus();
      for (const connection of connections) {
        if (connection.status === "connected") {
          await invoke("disconnect_from_database", { id: connection.id });
        }
      }
    });
  });

  const handleDisconnect = async () => {
    try {
      // Activeなタグに接続があれば接続解除
      const activeTabData = tabs().find((tab) => tab.id === activeTab());
      if (activeTabData && activeTabData.connectionId) {
        await invoke<string>("disconnect_from_database", {
          id: activeTabData.connectionId,
        });
        setTabs(
          tabs().map((tab) =>
            tab.id === activeTab() ? { ...tab, connectionId: "" } : tab
          )
        );
      }
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };

  const handleConnect = async (connectionId: string) => {
    setTabs(
      tabs().map((tab) =>
        tab.id === activeTab() ? { ...tab, connectionId } : tab
      )
    );
  };

  const addTab = () => {
    const id = createUniqueId();
    const newTab = {
      id: id,
      name: `Query ${id}`,
      content: "",
      connectionId: "",
    };
    setTabs([...tabs(), newTab]);
    setActiveTab(newTab.id);
  };

  const removeTab = (id: string) => {
    const removeTab = tabs().find((tab) => tab.id === id);
    // Tabの接続を解除
    if (removeTab) {
      invoke<string>("disconnect_from_database", {
        id: removeTab.connectionId,
      });
    }
    // Tab削除
    setTabs(tabs().filter((tab) => tab.id !== id));
    if (activeTab() === id && tabs().length > 1) {
      setActiveTab(tabs()[0].id);
    }
  };

  const handleTabClick = (id: string) => {
    setActiveTab(id);
  };

  const getActiveTabConnectionStatus = createMemo(
    (): ConnectionStatus | undefined => {
      const activeTabData = tabs().find((tab) => activeTab() === tab.id);
      const activeConnectionStatus = connectionStatus().find(
        (status) => status.id === activeTabData?.connectionId
      );
      return activeConnectionStatus;
    }
  );

  return (
    <>
      <nav class="navbar navbar-expand-lg navbar-light d-flex justify-content-between sticky-top p-0">
        <div class="navbar-brand">DBauri</div>

        <div class="d-flex align-items-center connection-info gap-2">
          <Switch>
            <Match
              when={
                !getActiveTabConnectionStatus()?.status ||
                getActiveTabConnectionStatus()?.status === "disconnected"
              }
            >
              <div class="me-2">接続なし</div>
            </Match>
            <Match
              when={getActiveTabConnectionStatus()?.status === "connected"}
            >
              <div class="me-2">接続中: {currentDbName()}</div>
            </Match>
          </Switch>

          <ConnectionForm
            setCurrentDbName={setCurrentDbName}
            onConnect={handleConnect}
          />
          <Button onClick={handleDisconnect} variant="secondary" class="ml-2">
            Disconnect
          </Button>
        </div>
      </nav>

      <main class="d-flex">
        <SideBar connectionId={getActiveTabConnectionStatus()?.id ?? ""} />

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
                <QueryEditor
                  connectionId={tab.connectionId}
                  value={tab.content}
                />
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
