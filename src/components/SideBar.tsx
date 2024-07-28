import { Container, Row } from "solid-bootstrap";
import SchemaList from "./SchemaList";

interface SideBarProps {
  connectionId: string;
}

export default function SideBar(props: SideBarProps) {
  return (
    <Container
      style={{ "max-width": "10rem", "border-right": "1px #ddd solid" }}
      class="pe-1"
    >
      <Row>
        <SchemaList connectionId={props.connectionId} />
      </Row>
    </Container>
  );
}
