import { Dropdown } from "solid-bootstrap";
import { Component } from "solid-js";

const SchemaList: Component = () => {
  return (
    <div class="sidebar">
      <Dropdown>
        <Dropdown.Toggle variant="light" id="dropdown-basic">
          Dropdown Button
        </Dropdown.Toggle>

        <Dropdown.Menu>
          <Dropdown.Item href="#/action-1">Action</Dropdown.Item>
          <Dropdown.Item href="#/action-2">Another action</Dropdown.Item>
          <Dropdown.Item href="#/action-3">Something else</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default SchemaList;
