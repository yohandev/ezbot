/// <reference types="@types/w3c-web-usb" />
/// <reference types="@types/w3c-web-serial" />

// Find partition magic numbers (inside REPL):
// import esp32
//
// vfs = esp32.Partition.find(esp32.Partition.TYPE_DATA, label='vfs')[0]
// print(vfs) # <Partition type=1, subtype=129, address=2097152, size=6291456, label=vfs, encrypted=0>
//
// Create littlefs file system:
// mklittlefs -c ./firmware -p 256 -b 4096 -s 6291456 firmware.bin
// 
// Upload everything simulataneously:
// esptool.py --chip esp32s3 --port /dev/tty.usbmodem101 --baud 460800 write_flash 0x0 ESP32_GENERIC_S3-20250809-v1.26.0.bin 0x200000 firmware.bin

const connectButton = document.getElementById("connect");

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

connectButton.addEventListener("click", async () => {
  navigator.usb.onconnect = (e) => {
    console.log("connected", e.device);
  };
  navigator.usb.ondisconnect = (e) => {
    console.log("disconnected", e.device);
  };

  const device = await navigator.usb.requestDevice({
    filters: [{ vendorId: 0x303a }],
  });

  console.log(device);
});