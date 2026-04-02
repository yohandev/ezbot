import firmware from "vfs:../firmware/src";
import micropython from "../firmware/ESP32_GENERIC_S3-20250809-v1.26.0.bin";
import { ESPLoader, Transport } from "esptool-js";

/**
 * @param {SerialPort} port
 */
export async function uploadFirmware(port) {
  const transport = new Transport(port);
  const loader = new ESPLoader({
    transport,
    baudrate: 460800,
  });
  const chipInfo = await loader.main();

  console.log(chipInfo);

  await loader.writeFlash({
    fileArray: fetchFirmware(),
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
function fetchFirmware() {
  if (!fetchFirmwareSingleton) {
    fetchFirmwareSingleton = [
      convertToBinaryString(micropython),
      convertToBinaryString(firmware.bin),
    ];
  }
  const [micropythonBin, firmwareBin] = fetchFirmwareSingleton;

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
