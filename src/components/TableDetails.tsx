import { Component, createSignal, onMount } from "solid-js";
import { Modal, Button } from "solid-bootstrap";
import { invoke } from "@tauri-apps/api";

interface TableDetailsProps {
  schema: string;
  table: string;
  connectionId: string;
  onClose: () => void;
}

export interface TableColumn {
  name: string;
  definition: string;
}

export interface TableInfo {
  name: string;
  comment: string | null;
  columns: TableColumn[];
}

const TableDetails: Component<TableDetailsProps> = (props) => {
  const [tableInfo, setTableInfo] = createSignal<TableInfo | null>(null);
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string | null>(null);

  const fetchTableInfo = async () => {
    setLoading(true);
    try {
      const response: TableInfo = await invoke("get_table_info", {
        id: props.connectionId,
        schema: props.schema,
        table: props.table,
      });
      setTableInfo(response);
      setError(null);
    } catch (err) {
      setError("Failed to fetch table information.");
      console.error("Error fetching table information:", err);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchTableInfo();
  });

  return (
    <Modal show onHide={props.onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Table Details: {props.table}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading() && <p>Loading...</p>}
        {error() && <p class="error">{error()}</p>}
        {tableInfo() && (
          <div>
            <p>
              <strong>Table Name:</strong> {tableInfo()?.name}
            </p>
            <p>
              <strong>Comment:</strong> {tableInfo()?.comment}
            </p>
            <h5>Columns:</h5>
            <ul>
              {tableInfo()?.columns.map((col: any) => (
                <li>
                  <strong>{col.name}</strong>: {col.definition}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={props.onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TableDetails;
