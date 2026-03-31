import { Firmware } from "./firmware";
import { EspFlash } from "./flash";
import { MicroPythonFs } from "./fs";
import { Log } from "./log";

const logger = new Log("upload-log");

/**
 * Show the "upload firmware" modal and eargerly fetch the firmware
 */
export function showUploadModal() {
  // Initialize modal
  addEventListeners();
  
  // Eagerly fetch resources
  Firmware.fetch();
  
  // Show modal
  document.getElementById("upload-overlay").classList.add("open");
}

async function uploadMicropython() {
  const firmware = await Firmware.fetch();

  const port = await navigator.serial.requestPort();
  const esp = new EspFlash(port, logger);

  logger.info("Connecting to bootloader...");
  if (!(await esp.romInfo())) {
    throw new Error(
      "Board isn't in bootloader mode. Hold BOOT and press RST, then try again.",
    );
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

let init = false;

function addEventListeners() {
  if (init) {
    return;
  }
  init = true;

  const overlay = document.getElementById("upload-overlay");
  const closeModal = () => overlay.classList.remove("open");
  document.getElementById("close-modal").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  const uploadMicropythonButton = document.getElementById("upload-micropython");
  const uploadFilesButton = document.getElementById("upload-files");

  uploadMicropythonButton.addEventListener("click", async () => {
    uploadMicropythonButton.disabled = true;

    try {
      await uploadMicropython();
      uploadFilesButton.style.display = "";
    } catch (e) {
      logger.error(`Error: ${e.message}`);
      console.error(e);
      uploadMicropythonButton.disabled = false;
    }
  });

  uploadFilesButton.addEventListener("click", async () => {
    uploadFilesButton.style.display = "none";

    try {
      await uploadPythonFiles();
    } catch (e) {
      logger.error(`Error: ${e.message}`);
      console.error(e);
    } finally {
      uploadMicropythonButton.disabled = false;
    }
  });
}
