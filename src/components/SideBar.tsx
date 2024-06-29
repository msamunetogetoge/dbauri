import { Container, Row } from "solid-bootstrap";
import SchemaList from "./SchemaList";

export default function SideBar() {
  return (
    <Container
      style={{ "max-width": "10rem", "border-right": "1px #ddd solid" }}
      class="pe-1"
    >
      <Row>
        <SchemaList />
      </Row>
    </Container>
  );
}
