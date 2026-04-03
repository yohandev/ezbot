import firmware from "vfs:../firmware/src";
import micropython from "../firmware/ESP32_GENERIC_S3-20250809-v1.26.0.bin";
import { ESPLoader, Transport } from "esptool-js";

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
    fileArray: fetchFirmware(name),
    flashSize: "keep",
    eraseAll: false,
    compress: true,
  });
  await transport.disconnect();
}

/**
 * Fetch the firmware once and cache it
 *
 * Note: this used to be an actual fetch(...) before the binaries were inlined
 */
function fetchFirmware(name) {
  if (!fetchFirmwareSingleton) {
    fetchFirmwareSingleton = [
      convertToBinaryString(micropython),
      convertToBinaryString(firmware.bin),
    ];
  }
  const [micropythonBin, firmwareBin] = fetchFirmwareSingleton;

  // TODO (yohang): string replace in the firmware with name

  return [
    { data: micropythonBin, address: 0x0 },
    { data: firmwareBin, address: firmware.address },
  ];
}

let fetchFirmwareSingleton = null;

/**
 * @param {Uint8Array} input
 * @returns {string}
 */
function convertToBinaryString(input) {
  if (typeof Buffer !== "undefined") {
    // Node.js specialization
    return Buffer.from(input).toString("binary");
  }

  // Web fall-back: process in chunks
  const CHUNK_SIZE = 8192;

  let out = "";
  for (let i = 0; i < input.length; i += CHUNK_SIZE) {
    const chunk = input.subarray(i, i + CHUNK_SIZE);

    out += String.fromCharCode.apply(null, chunk);
  }
  return out;
}

function withTimeout(promise, ms, msg = "timeout") {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(msg)), ms);
  });
  return Promise.race([promise, timeoutPromise]);
}
