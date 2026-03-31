import { Log } from "./log";
import { Firmware } from "./firmware";
import { EspFlash } from "./upload/flash";
import { MicroPythonFs } from "./upload/fs";

const logger = new Log();

async function uploadMicropython() {
  const firmware = await Firmware.fetch();

  const port = await navigator.serial.requestPort();
  const esp = new EspFlash(port, logger);

  logger.info("Connecting to bootloader...");
  if (!(await esp.romInfo())) {
    logger.error(
      "Board isn't in bootloader mode. Hold BOOT and press RST, then try again.",
    );
    return false;
  }

  logger.info("Erasing flash...");
  await esp.eraseFlash();

  logger.info("Uploading MicroPython...");
  await esp.writeFlash(firmware.micropython, logger.progress("Flash"));

  logger.info("Done. Resetting device...");
  await esp.softReset();

  logger.cta(
    'Press the physical RST button on your board, then click "Upload files".',
  );
  await esp.waitForHardReset();

  return true;
}

async function uploadPythonFiles() {
  const firmware = await Firmware.fetch();

  const port = await navigator.serial.requestPort();
  const fs = new MicroPythonFs(port, logger);

  try {
    for (const { path, contents } of firmware.sourceFiles()) {
      await fs.uploadFile(path, contents, logger.progress(path));
    }
    logger.info("Device is good to go!");
  } finally {
    await fs.close();
  }
}

const uploadBtn = document.getElementById("upload-btn");
const filesBtn = document.getElementById("files-btn");

uploadBtn.addEventListener("click", async () => {
  uploadBtn.disabled = true;
  try {
    const ok = await uploadMicropython();
    if (ok) filesBtn.style.display = "";
  } catch (e) {
    logger.error(`Error: ${e.message}`);
    console.error(e);
    uploadBtn.disabled = false;
  }
});

filesBtn.addEventListener("click", async () => {
  filesBtn.style.display = "none";
  try {
    await uploadPythonFiles();
  } catch (e) {
    logger.error(`Error: ${e.message}`);
    console.error(e);
  } finally {
    uploadBtn.disabled = false;
  }
});
