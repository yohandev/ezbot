import { Robot } from "./robot";
import { showUploadFirmwareModal } from "../upload/modal";

const remoteContainer = document.getElementById("remote-container");
const remoteUnconnectedEl = document.getElementById("remote-unconnected");

document
  .getElementById("remote-connect-button")
  .addEventListener("click", async () => {
    const robot = await Robot.connect();

    remoteContainer.appendChild(robot.domElement);
    remoteUnconnectedEl.hidden = true;
    remoteContainer.hidden = false;

    robot.onDisconnect(() => {
      robot.domElement.remove();
      remoteContainer.hidden = true;
      remoteUnconnectedEl.hidden = false;
    });
  });

document.getElementById("open-upload").addEventListener("click", () => {
  showUploadFirmwareModal();
});
