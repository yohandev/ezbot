import { ESPLoader, Transport } from "esptool-js";

export class EspFlash {
  #port;
  #logger;
  #transport;
  #loader;

  constructor(port, logger) {
    this.#port = port;
    this.#logger = logger;
    this.#transport = new Transport(this.#port, false);
    this.#loader = new ESPLoader({
      transport: this.#transport,
      baudrate: 460800,
    });
  }

  async romInfo() {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout connecting to bootloader")), 2000),
    );
    try {
      return await Promise.race([this.#loader.main(), timeout]);
    } catch (e) {
      this.#logger.warn(`Could not connect to bootloader: ${e.message}`);
      try {
        await this.#transport.disconnect();
      } catch {}
      this.#transport = null;
      this.#loader = null;

      return null;
    }
  }

  async eraseFlash() {
    await this.#loader.eraseFlash();
  }

  async writeFlash(binaryStr, progress) {
    await this.#loader.writeFlash({
      fileArray: [{ data: binaryStr, address: 0x0000 }],
      flashSize: "keep",
      compress: true,
      eraseAll: false,
      reportProgress: (_i, written, total) =>
        progress(Math.round((written / total) * 100)),
    });
  }

  async softReset() {
    await this.#loader.hardReset();
  }

  async waitForHardReset() {
    try {
      while (true) {
        await this.#transport.rawRead();
      }
    } catch {}
    await this.#transport.disconnect();
    await this.#transport.waitForUnlock(1500);
  }
}
