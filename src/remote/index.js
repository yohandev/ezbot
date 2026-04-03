document
  .getElementById("upload-firmware-button")
  .addEventListener("click", async () => {
    const { uploadFirmware } = await import("../upload");

    const port = await navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x303a }],
    });

    uploadFirmware(port, "robot #0", console.log);
  });
