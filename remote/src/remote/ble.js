export class EzbotBle {
  static SERVICE_UUID         = "19b10000-e8f2-537e-4f6c-d104768a1214";
  static INPUTS_STATE_UUID    = "19b10002-e8f2-537e-4f6c-d104768a1214";
  static INPUTS_METADATA_UUID = "618d53d4-14bd-4376-b1a9-9ec5077aba46";

  #device = null;
  #stateChar = null;
  #state = null;

  async connect() {
    this.#device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [EzbotBle.SERVICE_UUID] }],
    });
    const server  = await this.#device.gatt.connect();
    const service = await server.getPrimaryService(EzbotBle.SERVICE_UUID);
    this.#stateChar = await service.getCharacteristic(EzbotBle.INPUTS_STATE_UUID);
    const metaChar  = await service.getCharacteristic(EzbotBle.INPUTS_METADATA_UUID);
    const raw = await metaChar.readValue();
    const metadata = JSON.parse(new TextDecoder().decode(raw));
    this.#state = new Uint8Array(metadata.length);
    return metadata;
  }

  setInput(index, value) {
    if (this.#state) this.#state[index] = value & 0xFF;
  }

  async flush() {
    if (this.#stateChar && this.#state) {
      await this.#stateChar.writeValueWithoutResponse(this.#state.slice());
    }
  }

  get connected() {
    return this.#device?.gatt.connected ?? false;
  }

  disconnect() {
    this.#device?.gatt.disconnect();
  }
}
