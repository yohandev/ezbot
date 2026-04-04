import { Input } from "./input";

/** @typedef {import("web-bluetooth")} */

/**
 * Interface for an ezbot board over BLE
 */
export class Robot {
  // BLE UUIDs. MUST be consistent with firmware/
  static #EZBOT_SERVICE = "19b10000-e8f2-537e-4f6c-d104768a1214";
  static #INPUTS_STATE = "19b10002-e8f2-537e-4f6c-d104768a1214";
  static #INPUTS_METADATA = "618d53d4-14bd-4376-b1a9-9ec5077aba46";

  // Event listeners
  #onConnect = [];
  #onDisconnect = [];

  #name;
  #state;
  #inputs;
  #container;
  #intervalId = null;

  /**
   * @returns {Promise<Robot>}
   */
  static async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [this.#EZBOT_SERVICE] }],
    });
    const gatt = await device.gatt.connect();

    const service = await gatt.getPrimaryService(this.#EZBOT_SERVICE);
    const state = await service.getCharacteristic(this.#INPUTS_STATE);
    const meta = await service.getCharacteristic(this.#INPUTS_METADATA);

    const name = device.name ?? "";
    const layout = JSON.parse(new TextDecoder().decode(await meta.readValue()));

    return new Robot(name, state, layout);
  }

  /**
   * @private Use {@link Robot.connect} instead
   *
   * @typedef {import('./input').InputMeta[]} Layout
   *
   * @param {string?} name Device name
   * @param {BluetoothRemoteGATTCharacteristic} state Write-no-reponse characteristic for controller inputs
   * @param {Layout} layout Controller layout, as defined by reading the metadata characteristic
   */
  constructor(name, state, layout) {
    this.#name = name;
    this.#state = state;
    this.#inputs = layout.map((meta) => Input.fromMeta(meta));

    // Build remote UI
    this.#container = document.createElement("div");
    this.#container.className = "remote-layout";
    this.#container.innerHTML = `
      <div class="remote-top-grid">
        <div class="remote-pane remote-pane-left"></div>
        <div class="remote-pane remote-pane-center"></div>
        <div class="remote-pane remote-pane-right"></div>
      </div>
      <div class="remote-pane remote-pane-bottom"></div>
    `;

    for (let i = 0; i < this.#inputs.length; i++) {
      const pane = layout[i].pane ?? "center";
      const input = this.#inputs[i];

      this.#container
        .getElementsByClassName(`remote-pane-${pane}`)[0]
        .appendChild(input.domElement);
    }

    // Start control loop (20Hz)
    this.#intervalId = setInterval(() => {
      this.#state.writeValueWithoutResponse(this.state);
    }, 50);

    // BLE disconnect listener
    state.service.device.addEventListener("gattserverdisconnected", () => {
      clearInterval(this.#intervalId);

      this.#intervalId = null;
      this.#onDisconnect.forEach((cb) => cb());
    });
  }

  /**
   * @param {() => void} cb
   */
  onDisconnect(cb) {
    this.#onDisconnect.push(cb);
  }

  /**
   * Get the self-declared name of this robot
   */
  get name() {
    return this.#name;
  }

  /**
   * Disconnect from this robot. Triggers the onDisconnect callbacks.
   */
  disconnect() {
    this.#state.service.device.gatt.disconnect();
  }

  /**
   * Get the N-bytes state for all of this robot's inputs. This is recalculated
   * for each call, it is *not* the latest value sent to the robot.
   */
  get state() {
    const bytes = new Uint8Array(this.#inputs.length);
    for (let i = 0; i < this.#inputs.length; i++) {
      bytes[i] = this.#inputs[i].state;
    }
    return bytes;
  }

  /**
   * Get the top-most DOM element
   */
  get domElement() {
    return this.#container;
  }
}
