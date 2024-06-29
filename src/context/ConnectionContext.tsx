import { createSignal, createContext, useContext, Component } from "solid-js";

export type ConnectionMode = "disconnected" | "connected";

interface ConnectionContextType {
  connectionStatus: () => ConnectionMode;
  setConnectionStatus: (status: ConnectionMode) => void;
}

const ConnectionContext = createContext<ConnectionContextType>();

export const ConnectionProvider: Component<{ children: any }> = (props) => {
  const [connectionStatus, setConnectionStatus] =
    createSignal<ConnectionMode>("disconnected");

  return (
    <ConnectionContext.Provider
      value={{ connectionStatus, setConnectionStatus }}
    >
      {props.children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
};
