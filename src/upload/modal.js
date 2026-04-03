export function showUploadFirmwareModal() {
  // TODO
}

// EXAMPLE: lazy-loading the upload module (big file, 30 MB) and flashing a board
// 
// TODO: whenever the upload modal is opened, start this import in the background
// (kind of like a prefetch). Then, upload firmware if the button is pressed.
document
  .getElementById("upload-firmware-button")
  .addEventListener("click", async () => {
    const { uploadFirmware } = await import(".");

    const port = await navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x303a }],
    });

    uploadFirmware(port, "robot #0", console.log);
  });
