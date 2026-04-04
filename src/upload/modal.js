let uploadModulePromise = null;

const overlayEl = document.getElementById("info-overlay");
const logEl = document.getElementById("upload-firmware-log");

export function showInfoModal() {
  // Begin lazy-loading the large upload bundle in the background
  uploadModulePromise ??= import(".");

  overlayEl.classList.add("active");
}

document.querySelectorAll(".collapsible").forEach((section) => {
  section.querySelector(".collapsible-toggle").addEventListener("click", () => {
    section.classList.toggle("expanded");
  });
  section.querySelector(".collapsible-body").addEventListener("click", () => {
    section.classList.add("expanded");
  });
});

overlayEl.addEventListener("click", (e) => {
  if (e.target === overlayEl) overlayEl.classList.remove("active");
});

document.getElementById("info-close").addEventListener("click", () => {
  overlayEl.classList.remove("active");
});

document
  .getElementById("upload-firmware-button")
  .addEventListener("click", async () => {
    logEl.hidden = false;
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
