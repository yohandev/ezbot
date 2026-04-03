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
  #onUpdateInputs = [];

  #name;
  #state;
  #inputs;

  static async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [Robot.#EZBOT_SERVICE] }],
    });
    const gatt = await device.gatt.connect();

    const service = await gatt.getPrimaryService(Robot.#EZBOT_SERVICE);
    const state = await service.getCharacteristic(Robot.#INPUTS_STATE);
    const meta = await service.getCharacteristic(Robot.#INPUTS_METADATA);

    const name = ""; // TODO how to get this?
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

    // TODO: create the DOM elements for the left, right, center, bottom panes
    // TODO: add inputs to this pane
    // 
    // TODO: connect the callbacks (onConnect, onDisconnect)
  }

  /**
   * @param {() => void} cb
   */
  onConnect(cb) {
    this.#onConnect.push(cb);
    
    // TODO: (re)start interval to send inputs to characteristic
  }

  /**
   * @param {() => void} cb
   */
  onDisconnect(cb) {
    this.#onDisconnect.push(cb);
    
    // TODO: stop interval to send characteristic
  }
  
  /**
   * Get the top-most DOM element
   */
  get domElement() {
    // TODO
  }
}
