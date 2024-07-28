import {
  createSignal,
  createContext,
  useContext,
  Component,
  Accessor,
  Setter,
} from "solid-js";

// 接続ステータスのタイプ
export type ConnectionMode = "disconnected" | "connected";
// 接続ステータス
export type ConnectionStatus = {
  id: string;
  status: ConnectionMode;
};

// 接続コンテキストのタイプ
interface ConnectionContextType {
  connectionStatus: Accessor<ConnectionStatus[]>;
  setConnectionStatus: Setter<ConnectionStatus[]>;
}

const initialConnectionStatus: ConnectionStatus[] = [];

// 接続コンテキストの作成
const ConnectionContext = createContext<ConnectionContextType>();

// 接続コンテキストプロバイダーの実装
export const ConnectionProvider: Component<{ children: any }> = (props) => {
  const [connectionStatus, setConnectionStatus] = createSignal<
    ConnectionStatus[]
  >(initialConnectionStatus);

  return (
    <ConnectionContext.Provider
      value={{ connectionStatus, setConnectionStatus }}
    >
      {props.children}
    </ConnectionContext.Provider>
  );
};

// useConnectionフックの実装
export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
};
