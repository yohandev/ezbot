import MICROPYTHON_BIN from "../../../firmware/ESP32_GENERIC_S3-20250809-v1.26.0.bin";

export class Firmware {
  static SOURCES = [
    "main.py",
    "motor.py",
    "remote.py",
    "aioble/__init__.py",
    "aioble/central.py",
    "aioble/client.py",
    "aioble/core.py",
    "aioble/device.py",
    "aioble/l2cap.py",
    "aioble/peripheral.py",
    "aioble/security.py",
    "aioble/server.py",
  ];

  static #fetchPromise;

  #micropython;
  #files;

  constructor(micropython, files) {
    this.#micropython = micropython;
    this.#files = files;
  }

  static async fetch() {
    if (!Firmware.#fetchPromise) {
      Firmware.#fetchPromise = Firmware.#load();
    }
    return await Firmware.#fetchPromise;
  }

  static async #load() {
    const bin = await (await fetch(MICROPYTHON_BIN)).arrayBuffer();
    
    let micropython = "";
    new Uint8Array(bin).forEach((b) => {
      micropython += String.fromCharCode(b);
    });

    const files = await Promise.all(
      Firmware.SOURCES.map(async (path) => {
        const url = (await import("../../../firmware/src/" + path)).default;
        const contents = await (await fetch(url.toString())).text();
        
        return { path, contents };
      }),
    );

    return new Firmware(micropython, files);
  }

  get micropython() {
    return this.#micropython;
  }

  *sourceFiles() {
    for (const { path, contents } of this.#files) {
      yield { path, contents };
    }
  }
}
