import nipplejs from "nipplejs";

export class JoystickInput {
  #state = 0;

  constructor(container) {
    const zone = document.createElement("div");
    zone.className = "joystick-zone";
    container.appendChild(zone);

    const mgr = nipplejs.create({
      zone,
      mode: "static",
      position: { left: "50%", top: "50%" },
      size: 140,
      color: "rgba(255,255,255,0.6)",
    });
    mgr.on("move", (_e, d) => {
      this.#state = JoystickInput.#encode(d.angle.degree, d.distance / 75);
    });
    mgr.on("end", () => {
      this.#state = 0;
    });
  }

  // Encode nipplejs polar output into a single byte:
  //   bits [7:3] = direction (0–31, 11.25°/step, 0 = east CCW)
  //   bits [2:0] = magnitude (0–7)
  static #encode(angleDeg, normalizedDist) {
    if (normalizedDist < 0.05) return 0;
    const direction = Math.round(angleDeg / 11.25) & 0x1F;
    const magnitude = Math.round(Math.min(normalizedDist, 1) * 7);
    return (direction << 3) | magnitude;
  }

  get state() {
    return this.#state;
  }
}
