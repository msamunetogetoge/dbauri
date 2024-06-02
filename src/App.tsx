import { Component, Show, createSignal } from "solid-js";
import { Container, Row, Col, Button } from "solid-bootstrap";
import ConnectionForm from "./components/ConnectionForm";
import QueryEditor from "./components/QueryEditor";
// import TableList from "./components/TableList";
// import TableDetails from "./components/TableDetails";
// import SchemaList from "./components/SchemaList";

const App: Component = () => {
  return (
    <div>
      <nav class="navbar navbar-expand-lg navbar-light d-flex justify-content-between p-2">
        <div class="navbar-brand">DBauri</div>
        <ConnectionForm />
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
