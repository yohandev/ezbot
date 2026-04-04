let uploadModulePromise = null;

const overlayEl = document.getElementById("upload-firmware-overlay");
const logEl = document.getElementById("upload-firmware-log");

export function showUploadFirmwareModal() {
  // Begin lazy-loading the large upload bundle in the background
  uploadModulePromise ??= import(".");

  overlayEl.classList.add("active");
}

document
  .getElementById("upload-firmware-close")
  .addEventListener("click", () => {
    overlayEl.classList.remove("active");
  });

document
  .getElementById("upload-firmware-button")
  .addEventListener("click", async () => {
    const writeLine = (msg) => {
      logEl.textContent += msg + "\n";
      logEl.scrollTop = logEl.scrollHeight;
    };

    try {
      const { uploadFirmware } = await (uploadModulePromise ??= import("."));
      const port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: 0x303a }],
      });
      writeLine("Starting upload...");
      await uploadFirmware(port, "ezbot", writeLine);
      writeLine("Done.");
    } catch (err) {
      writeLine(`Error: ${err.message}`);
    }
  });
