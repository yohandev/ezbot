import { Robot } from "./robot";
import { showInfoModal } from "../upload/modal";

const headerRight = document.getElementById("header-right");
const remoteContainer = document.getElementById("remote-container");
const remoteUnconnectedEl = document.getElementById("remote-unconnected");

document
  .getElementById("remote-connect-button")
  .addEventListener("click", async () => {
    const robot = await Robot.connect();

    headerRight.innerHTML = `<span class="robot-name">${robot.name || "ezbot"}</span>`;
    const disconnectBtn = document.createElement("button");
    disconnectBtn.id = "disconnect-btn";
    disconnectBtn.textContent = "Disconnect";
    disconnectBtn.addEventListener("click", () => robot.disconnect());
    headerRight.appendChild(disconnectBtn);

    remoteUnconnectedEl.hidden = true;
    remoteContainer.appendChild(robot.domElement);
    remoteContainer.hidden = false;

    robot.onDisconnect(() => {
      headerRight.innerHTML = "";
      robot.domElement.remove();
      remoteContainer.hidden = true;
      remoteUnconnectedEl.hidden = false;
    });
  });

document.getElementById("open-info").addEventListener("click", (e) => {
  e.preventDefault();
  showInfoModal();
});
