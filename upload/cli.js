import { SerialPort } from "./serial_adapter";
import { uploadFirmware } from ".";

(async () => {
  const port = await SerialPort.create("/dev/tty.usbmodem101");
  
  await uploadFirmware(port);
})();

