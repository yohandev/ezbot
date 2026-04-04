import { Robot } from "./robot";
import { showInfoModal } from "../upload/modal";

const headerRight = document.getElementById("header-right");
const remoteContainer = document.getElementById("remote-container");
const remoteUnconnectedEl = document.getElementById("remote-unconnected");
const remoteConnectingEl = document.getElementById("remote-connecting");
const connectErrorEl = document.getElementById("connect-error");

document
  .getElementById("remote-connect-button")
  .addEventListener("click", async () => {
    connectErrorEl.hidden = true;
    remoteUnconnectedEl.hidden = true;
    remoteConnectingEl.hidden = false;

    let robot;
    try {
      robot = await Robot.connect();
    } catch (err) {
      remoteConnectingEl.hidden = true;
      remoteUnconnectedEl.hidden = false;
      connectErrorEl.textContent = err.message;
      connectErrorEl.hidden = false;
      return;
    }

    remoteConnectingEl.hidden = true;

    headerRight.innerHTML = `<span class="robot-name">${robot.name || "ezbot"}</span>`;
    const disconnectBtn = document.createElement("button");
    disconnectBtn.id = "disconnect-btn";
    disconnectBtn.textContent = "Disconnect";
    disconnectBtn.addEventListener("click", () => robot.disconnect());
    headerRight.appendChild(disconnectBtn);

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
