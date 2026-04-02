// import { showUploadModal } from "./upload";
// import { initRemote } from "./remote";

import "../assets/styles.css";
import { uploadFirmware } from "./upload";

// document.getElementById("open-upload").addEventListener("click", showUploadModal);
// initRemote();

document.getElementById("upload-button").addEventListener("click", async () => {
  // For debugging on localhost, remove serial port access here:
  // arc://settings/content/siteDetails?site=http://localhost:8000/
  const port = await navigator.serial.requestPort({
    filters: [{ usbVendorId: 0x303a }],
  });
  await uploadFirmware(port);
});
