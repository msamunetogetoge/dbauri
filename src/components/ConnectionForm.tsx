import {
  Component,
  createSignal,
  createEffect,
  onMount,
  For,
  Show,
} from "solid-js";
import { Form, Button, Modal, Stack, Alert } from "solid-bootstrap";
import { invoke } from "@tauri-apps/api/tauri";

interface ConnectionInfoDetail {
  name?: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  dbName?: string;
}

interface ConnectionInfo {
  connectionName: string;
  connectionString: string;
}

const ConnectionForm: Component<{
  setCurrentDbName: (name: string) => void;
  onConnect: (connectionId: string) => void;
}> = (props) => {
  const [connectionInfo, setConnectionInfo] =
    createSignal<ConnectionInfoDetail>({
      name: "",
      user: "",
      password: "",
      host: "",
      port: 5432,
      dbName: "",
    });
  const [connectionString, setConnectionString] = createSignal<string>("");
  const [show, setShow] = createSignal(false);
  const [savedConnections, setSavedConnections] = createSignal<
    ConnectionInfo[]
  >([]);
  const [selectedConnection, setSelectedConnection] = createSignal<string>("");

  const [alertMessage, setAlertMessage] = createSignal<string>("");
  const [alertVariant, setAlertVariant] = createSignal<"success" | "danger">(
    "success"
  );

  createEffect(() => {
    const info = connectionInfo();
    if (info.user && info.password && info.host && info.port && info.dbName) {
      console.debug("createEffect connectionString is updated");
      const connStr = `postgresql://${info.user}:${info.password}@${info.host}:${info.port}/${info.dbName}`;
      setConnectionString(connStr);
    }
  });

  // 初期表示時、保存されたdb情報読み込み
  onMount(async () => {
    const connections = await invoke<ConnectionInfo[]>("get_saved_connections");
    setSavedConnections(connections);
  });

  // 接続ボタン押下時処理
  const handleConnect = async () => {
    const pattern =
      /^postgresql:\/\/([^:]{1,}):([^@]{1,})@([^:]{1,}):(\d{1,})\/(.{1,})$/;

    try {
      if (pattern.test(connectionString())) {
        const info: ConnectionInfo = {
          connectionName: connectionInfo().name || "noNameConncetion",
          connectionString: connectionString(),
        };

        // 接続 -> 保存 -> アプリ全体に通知
        const response = await invoke<string>("connect_to_database", {
          connectionInfo: info,
        });
        setAlertMessage(response);
        setAlertVariant("success");
        await invoke<string>("save_connection_info", {
          connectionInfo: info,
        });
        props.setCurrentDbName(info.connectionName);
        props.onConnect(response);
      } else {
        setAlertMessage("Connection string is not in the correct format.");
        setAlertVariant("danger");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setAlertMessage(`Connection error: ${error}`);
      setAlertVariant("danger");
    }
  };

  // セレクトから既存の接続情報を選んだ時に成型してセット
  const handleSavedConnectionSelect = (e: any) => {
    const selected = e.currentTarget?.value;
    setSelectedConnection(selected);
    const connection = savedConnections().find(
      (conn) => conn.connectionName === selected
    );
    if (connection) {
      const [user, password, host, port, dbName] = connection.connectionString
        .replace("postgresql://", "")
        .split(/[:@/]/);

      setConnectionInfo({
        name: connection.connectionName,
        user,
        password,
        host: host,
        port: parseInt(port),
        dbName,
      });
    }
  };

  // 手動で接続情報入力時の処理
  const handleInputChange =
    (field: keyof ConnectionInfoDetail) => (e: Event) => {
      const target = e.target as HTMLInputElement;
      setConnectionInfo({ ...connectionInfo(), [field]: target.value });
    };

  const onModalHide = () => {
    setShow(false);
    setAlertMessage("");
  };

  return (
    <>
      <Button class="" variant="light" onClick={() => setShow(true)}>
        Connection Setting
      </Button>
      <Modal
        show={show()}
        onHide={onModalHide}
        dialogClassName="modal-90w"
        aria-labelledby="example-custom-modal-styling-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="example-custom-modal-styling-title">
            Connection Setting
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Stack direction="vertical" gap={3}>
              <Form.Select
                onChange={handleSavedConnectionSelect}
                value={selectedConnection()}
              >
                <option value="">Select saved connection</option>
                <For each={savedConnections()}>
                  {(conn, index) => (
                    <option value={conn.connectionName}>
                      {conn.connectionName}
                    </option>
                  )}
                </For>
              </Form.Select>
              <Show when={selectedConnection() === ""}>
                <Form.Control
                  type="text"
                  placeholder="Connection Name"
                  value={connectionInfo().name}
                  onInput={handleInputChange("name")}
                />
                <Form.Control
                  type="text"
                  placeholder="User"
                  value={connectionInfo().user}
                  onInput={handleInputChange("user")}
                />

                <Form.Control
                  type="password"
                  placeholder="Password"
                  value={connectionInfo().password}
                  onInput={handleInputChange("password")}
                />

                <Form.Control
                  type="text"
                  placeholder="host"
                  value={connectionInfo().host}
                  onInput={handleInputChange("host")}
                />

                <Form.Control
                  type="number"
                  placeholder="Port"
                  value={connectionInfo().port}
                  onInput={handleInputChange("port")}
                />

                <Form.Control
                  type="text"
                  placeholder="Database Name"
                  value={connectionInfo().dbName}
                  onInput={handleInputChange("dbName")}
                />
              </Show>

              <Button onClick={handleConnect} variant="primary">
                Connect
              </Button>
              <Show when={alertMessage() !== ""}>
                <Alert variant={alertVariant()}>{alertMessage()}</Alert>
              </Show>
            </Stack>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ConnectionForm;
