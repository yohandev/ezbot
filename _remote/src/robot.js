import "web-bluetooth";

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
  #meta;

  static async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [Robot.#EZBOT_SERVICE] }],
    });
    const gatt = await device.gatt.connect();

    const service = await gatt.getPrimaryService(Robot.#EZBOT_SERVICE);
    const state = await service.getCharacteristic(Robot.#INPUTS_STATE);
    const meta = await service.getCharacteristic(Robot.#INPUTS_METADATA);

    const layout = new TextDecoder().deocde(await meta.readValue());

  }

  /**
   * @private Use {@link Robot.connect} instead
   * @param {string?} name Device name
   * @param {BluetoothRemoteGATTCharacteristic} state Write-no-reponse characteristic for controller inputs
   * @param {BluetoothRemoteGATTCharacteristic} meta Read/notify characteristic for controller metadata
   */
  constructor(name, state, meta) {
    this.#name = name;
    this.#state = state;
    this.#meta = meta;

    // The stock firmware doesn't do this, but in theory the remote control could be
    // updated dynamically
    meta.startNotifications().then(() => {
      meta.addEventListener("characteristicvaluechanged", (e) => {
        const inputs = Robot.#buildInputs(e.target.value);

        this.#onUpdateInputs.forEach((cb) => cb?.(inputs));
      });
    });
  }

  /**
   * @param {() => void} cb
   */
  onConnect(cb) {
    this.#onConnect.push(cb);
  }

  /**
   * @param {() => void} cb
   */
  onDisconnect(cb) {
    this.#onDisconnect.push(cb);
  }

  /**
   * @param {(inputs: Input[]) => void} cb
   */
  onUpdateInputs(cb) {
    this.#onUpdateInputs.push(cb);
  }

  /**
   * Immediately read the metadata characteristics and rebuild the inputs.
   * Note: this discards any prior inputs
   */
  async getInputs() {}

  /**
   * @param {DataView<ArrayBufferLike>} raw Metadata characteristic value
   * @returns {Input[]}
   */
  static #buildInputs(raw) {}
}

/**
 * Abstract class for an input. These are requested by the firmware
 */
export class Input {
  // Event listeners
  #onremove = [];

  /**
   * @returns {'center'|'left'|'right'|'bottom'} The pane where this input should live
   */
  get pane() {
    return new Error("Cannot directly call an abstract method");
  }
}
