import firmware from "vfs:../../firmware/src";
import micropython from "../../firmware/ESP32_GENERIC_S3-20250809-v1.26.0.bin";
import { ESPLoader, Transport } from "esptool-js";

/**
 * @param {SerialPort} port
 */
export async function uploadFirmware(port) {
  const transport = new Transport(port);

  if (!port.connected) {
    await transport.connect(115200);
  }

  const loader = new ESPLoader({
    transport,
    baudrate: 460800,
  });
  const chipInfo = await loader.main();

  console.log(chipInfo);

  await loader.writeFlash({
    fileArray: await fetchFirmware(),
    flashSize: "keep",
    eraseAll: false,
    compress: true,
  });
}

/**
 * Fetch the firmware once and cache it
 */
async function fetchFirmware() {
  if (!fetchFirmwareSingleton) {
    fetchFirmwareSingleton = await Promise.all([
      fetchAsBinaryString(micropython),
      fetchAsBinaryString(firmware.binUrl),
    ]);
  }
  const [micropythonBin, firmwareBin] = await fetchFirmwareSingleton;

  return [
    { data: micropythonBin, address: 0x0 },
    { data: firmwareBin, address: firmware.address },
  ];
}

let fetchFirmwareSingleton = null;

/**
 * Fetch the given URL as a binary string (expected by esptool-js)
 */
async function fetchAsBinaryString(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(blob);
  });
}
