import { Duplex } from "node:stream";
import { SerialPort as NodeSerialPort } from "serialport";

export class SerialPort extends EventTarget {
  #info; // Device info (path, USB vendor/product ID)

  /** @type {NodeSerialPort} */
  #inner;
  #readable;
  #writable;

  /**
   * @param {string} path
   */
  static async create(path) {
    // idk if there's a better way to get serial port info
    const ports = await NodeSerialPort.list();
    const info = ports.find((p) => p.path === path);

    return new SerialPort(info);
  }

  /**
   * @typedef {{ path: string, manufacturer: string?, serialNumber: string?, vendorId: string?, productId: string? }} PortInfo
   * @returns {Promise<PortInfo[]>}
   */
  static async list(filters) {
    const ports = await NodeSerialPort.list();

    if (!filters || filters.length === 0) {
      return ports;
    }

    return ports.filter((port) =>
      filters.some((filter) => {
        if (
          filter.usbVendorId !== undefined &&
          parseInt(port.vendorId, 16) !== filter.usbVendorId
        ) {
          return false;
        }
        if (
          filter.usbProductId !== undefined &&
          parseInt(port.productId, 16) !== filter.usbProductId
        ) {
          return false;
        }
        return true;
      }),
    );
  }

  /**
   * @param {PortInfo} info
   * @see {@link SerialPort.create}
   */
  constructor(info) {
    super();

    if (!info || !info.path) {
      throw new TypeError(
        "Failed to construct 'SerialPort': The port path is required.",
      );
    }
    this.#info = info;
  }

  get readable() {
    return this.#readable;
  }

  get writable() {
    return this.#writable;
  }

  get connected() {
    return this.#inner && this.#inner.isOpen;
  }

  getInfo() {
    return {
      usbVendorId: this.#info.vendorId
        ? parseInt(this.#info.vendorId, 16)
        : undefined,
      usbProductId: this.#info.productId
        ? parseInt(this.#info.productId, 16)
        : undefined,
    };
  }

  async open({
    baudRate,
    dataBits = 8,
    stopBits = 1,
    parity = "none",
    bufferSize = 255,
    flowControl = "none",
  }) {
    if (!baudRate) {
      throw new TypeError(
        "Failed to execute `open` on `SerialPort`: baudRate is required.",
      );
    }
    if (this.connected) {
      throw new DOMException("Port is already open", "InvalidStateError");
    }

    // First-time opening
    if (!this.#inner) {
      this.#inner = new NodeSerialPort({
        path: this.#info.path,
        baudRate,
        dataBits,
        stopBits,
        parity,
        rtscts: flowControl === "hardware",
        highWaterMark: bufferSize,
        autoOpen: false,
      });

      const streams = Duplex.toWeb(this.#inner);
      const readableStream = () => {
        // Make the stream self-healing via a proxy
        // Not sure why this is needed on read side but it was a pain in the
        // ass to debug
        const proxy = streams.readable.getReader();

        return new ReadableStream({
          async pull(controller) {
            try {
              const { value, done } = await proxy.read();
              if (done) {
                controller.close();
              } else {
                controller.enqueue(new Uint8Array(value));
              }
            } catch (error) {
              controller.error(error);
            }
          },
          cancel: async () => {
            proxy.releaseLock();

            await new Promise((resolve) => {
              this.#inner.flush(() => resolve());
            });
            this.#readable = readableStream();
          },
        });
      };
      this.#writable = streams.writable;
      this.#readable = readableStream();
    }

    try {
      // Open port
      await new Promise((res, rej) =>
        this.#inner.open((e) => (e ? rej(e) : res())),
      );

      // Set baudrate
      await new Promise((res, rej) => {
        this.#inner.update({ baudRate }, (e) => (e ? rej(e) : res()));
      });
    } catch (err) {
      this.#inner = null;
      this.#readable = null;
      this.#writable = null;

      throw new DOMException(err.message, "NetworkError");
    }

    this.#inner.once("close", () => {
      this.dispatchEvent(new Event("disconnect"));
    });
  }

  close() {
    if (!this.connected) {
      throw new DOMException("The port is not open.", "InvalidStateError");
    }

    // Web Serial requires streams to be unlocked before closing
    if (this.#readable?.locked || this.#writable?.locked) {
      throw new DOMException(
        "Cannot close the port while streams are locked. Cancel the reader and abort the writer first.",
        "InvalidStateError",
      );
    }

    return new Promise((res, rej) => {
      this.#inner.close((err) => {
        if (err) {
          return rej(new DOMException(err.message, "NetworkError"));
        }

        this.#inner = undefined;
        this.#readable = undefined;
        this.#writable = undefined;

        res();
      });
    });
  }

  setSignals({ dataTerminalReady, requestToSend }) {
    if (!this.connected) {
      throw new DOMException("The port is not open.", "InvalidStateError");
    }

    const signals = {};
    if (dataTerminalReady !== undefined) {
      signals.dtr = dataTerminalReady;
    }
    if (requestToSend !== undefined) {
      signals.rts = requestToSend;
    }

    return new Promise((res, rej) => {
      this.#inner.set(signals, (err) => {
        if (err) {
          return rej(new DOMException(err.message, "NetworkError"));
        }
        res();
      });
    });
  }

  async getSignals() {
    if (!this.connected) {
      throw new DOMException("The port is not open.", "InvalidStateError");
    }

    return new Promise((res, rej) => {
      this.#inner.get((err, status) => {
        if (err) return rej(new DOMException(err.message, "NetworkError"));

        res({
          dataCarrierDetect: status.dcd,
          clearToSend: status.cts,
          ringIndicator: status.ri,
          dataSetReady: status.dsr,
        });
      });
    });
  }
}
