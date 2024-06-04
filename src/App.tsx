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
    <>
      <nav class="navbar navbar-expand-lg navbar-light d-flex justify-content-between sticky-top p-0">
        <div class="navbar-brand">DBauri</div>

        <div class="d-flex align-items-center connection-info">
          <Show when={currentDbName() !== ""}>
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
