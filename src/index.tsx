/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./custom.scss";

render(() => <App />, document.getElementById("root") as HTMLElement);
