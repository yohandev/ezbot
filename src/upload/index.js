/**
 * Entry point for the firmware uploading utility.
 *
 * This module is platform agnostic, but the serial port passed in should
 * follow WebSerial's `SerialPort` API (*NOT* the `serialport` npm package).
 */
import { ESPLoader, Transport } from "esptool-js";
import firmware from ">>firmware<<"; // build script fills this in

/**
 * @param {SerialPort} port
 */
export async function uploadFirmware(port, name, writeLine) {
  const transport = new Transport(port);
  const loader = new ESPLoader({
    transport,
    baudrate: 460800,
    terminal: { writeLine, write() {}, clean() {} },
  });

  // Try reading from bootloader ROM
  await withTimeout(
    loader.main(),
    5000,
    "Board isn't in bootloader mode. Hold BOOT and press RST!",
  );

  await loader.writeFlash({
    fileArray: firmware, // TODO: modify firmware to set name
    flashSize: "keep",
    eraseAll: false,
    compress: true,
  });
  await transport.disconnect();
}

function withTimeout(promise, ms, msg = "timeout") {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(msg)), ms);
  });
  return Promise.race([promise, timeoutPromise]);
}
