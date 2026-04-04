import { Robot } from "./robot";
import { showInfoModal } from "../upload/modal";

if (!navigator.bluetooth) {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);

  const currentUrl = window.location.href;
  let name, href, store, clickHandler;

  if (isIOS) {
    name = "Bluefy";
    store = "App Store";
    const storeUrl =
      "https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055";
    href = `bluefy://open?url=${encodeURIComponent(currentUrl)}`;
    clickHandler = (e) => {
      e.preventDefault();
      window.location.href = href;
      // If Bluefy isn't installed the scheme silently fails; redirect to store
      setTimeout(() => {
        if (document.visibilityState !== "hidden")
          window.location.href = storeUrl;
      }, 1500);
    };
  } else if (isAndroid) {
    name = "Chrome";
    store = "Google Play";
    const storeUrl =
      "https://play.google.com/store/apps/details?id=com.android.chrome";
    const loc = window.location;
    // Android intent URI — the browser handles the store fallback natively
    href = `intent://${loc.host}${loc.pathname}${loc.search}#Intent;scheme=${loc.protocol.slice(0, -1)};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(storeUrl)};end`;
  } else {
    name = "Chrome";
    store = "";
    href = "https://www.google.com/chrome/";
    clickHandler = (e) => {
      e.preventDefault();
      window.open(href, "_blank");
    };
  }

  document.getElementById("remote-connect-button").hidden = true;
  const noBluetoothEl = document.getElementById("remote-no-bluetooth");
  noBluetoothEl.innerHTML = `
    <p class="no-bt-hint">Web Bluetooth is required to connect to your robot. Your current browser doesn't support it.</p>
    <a class="no-bt-rec">
      <img class="no-bt-icon" src="${isIOS ? "assets/bluefy.webp" : "assets/chrome.svg"}" alt="${name}" width="56" height="56">
      <span class="no-bt-rec-text">
        <span class="no-bt-rec-name">Open in ${name}</span>
        <span class="no-bt-rec-store">${store}</span>
      </span>
      <span class="no-bt-rec-arrow">›</span>
    </a>
  `;
  const recLink = noBluetoothEl.querySelector(".no-bt-rec");
  recLink.href = href;
  if (clickHandler) recLink.addEventListener("click", clickHandler);
  noBluetoothEl.hidden = false;
}

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
