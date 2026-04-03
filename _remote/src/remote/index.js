import { EzbotBle } from "./ble";
import { JoystickInput } from "../inputs/joystick";
import { ButtonInput } from "../inputs/button";
import { SliderInput } from "../inputs/slider";

const ble = new EzbotBle();
let loopId = null;

export function initRemote() {
  document.getElementById("connect-btn").addEventListener("click", connect);
}

async function connect() {
  const btn = document.getElementById("connect-btn");
  btn.disabled = true;
  try {
    const metadata = await ble.connect();
    const inputs = buildLayout(metadata);
    document.getElementById("remote-unconnected").hidden = true;
    document.getElementById("remote-layout").hidden = false;
    startLoop(inputs);
  } catch (e) {
    console.error(e);
    btn.disabled = false;
  }
}

function buildLayout(metadata) {
  const panes = {
    left: document.getElementById("pane-left"),
    center: document.getElementById("pane-center"),
    right: document.getElementById("pane-right"),
    bottom: document.getElementById("pane-bottom"),
  };

  return metadata.map(({ type, pane = "center", color }) => {
    const container = panes[pane] ?? panes.center;
    if (type === "joystick") return new JoystickInput(container);
    if (type === "button") return new ButtonInput(container, { color });
    if (type === "slider") return new SliderInput(container, { pane });
    return null;
  });
}

function startLoop(inputs) {
  loopId = setInterval(async () => {
    if (!ble.connected) {
      clearInterval(loopId);
      loopId = null;
      document.getElementById("remote-unconnected").hidden = false;
      document.getElementById("remote-layout").hidden = true;
      document.getElementById("connect-btn").disabled = false;
      return;
    }
    inputs.forEach((inp, i) => {
      if (inp) ble.setInput(i, inp.state);
    });
    await ble.flush().catch(console.error);
  }, 50);
}
