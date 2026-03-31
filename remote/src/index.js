// Entry-point: attach all event handlers, etc...
import MICROPYTHON_BIN from "../../firmware/ESP32_GENERIC_S3-20250809-v1.26.0.bin";

/**
 * Upload the Micropython binary to the ESP32 at the given serial port,
 * then upload the firmware itself (python)
 */
async function uploadFirmware(serialPort) {
  const SOURCES = [
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

  // Fetch the Micropython binary
  const micropythonBin = await (await fetch(MICROPYTHON_BIN)).arrayBuffer();

  // Fetch the firmware source files
  const firmware = await Promise.all(
    SOURCES.map(async (path) => {
      const url = (await import("../../firmware/src/" + path)).default;
      const contents = await (await fetch(url.toString())).text();

      return { path, contents };
    }),
  );
}

uploadFirmware(null);
