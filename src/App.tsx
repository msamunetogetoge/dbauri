import { Component, Show, createSignal } from "solid-js";
import { Container, Row, Col, Button } from "solid-bootstrap";
import ConnectionForm from "./components/ConnectionForm";
import QueryEditor from "./components/QueryEditor";
// import TableList from "./components/TableList";
// import TableDetails from "./components/TableDetails";
// import SchemaList from "./components/SchemaList";

const App: Component = () => {
  const [currentDbName, setCurrentDbName] = createSignal<string>("");
  return (
    <div>
      <nav class="navbar navbar-expand-lg navbar-light d-flex justify-content-between p-2">
        <div class="navbar-brand">DBauri</div>

        <div class="d-flex align-items-center connection-info">
          <Show when={currentDbName() !== ""}>
            <div class="me-2">接続中: {currentDbName()}</div>
          </Show>
          <ConnectionForm setCurrentDbName={setCurrentDbName} />
        </div>
      </nav>

      <div class="d-flex">
        {/* <SchemaList /> */}
        <Container fluid class="content">
          <Row>
            <Col md={12}>
              <QueryEditor />
            </Col>
          </Row>
          {/* <Row>
            <Col md={12}>
              <TableDetails />
            </Col>
          </Row> */}
        </Container>
      </div>
    </div>
  );
};

export default App;
