import nipplejs from "nipplejs";

/**
 * Abstract class for an input. These are requested by the firmware.
 *
 * @typedef {object} InputMeta
 * @property {'joystick'|'button'|'slider'} type
 * @property {'center'|'left'|'right'|'bottom'} pane
 * @property {'red'|'blue'|'green'|'orange'|'purple'|'cyan'} color Only applies to buttons
 * @property {boolean} latching Only applies to buttons
 */
export class Input {
  /**
   * Create an input controller + UI from its metadata
   *
   * @param {InputMeta} meta
   * @returns {Input}
   */
  static fromMeta(meta) {
    switch (meta.type) {
      case "joystick":
        return new Joystick();
      case "button":
        return new Button(meta.color ?? "blue", meta.latching ?? false);
      case "slider":
        return new Slider(meta.pane === "bottom");
      default:
        throw new TypeError(`Unknown input type "${meta.type}"`);
    }
  }

  /**
   * Encode the state in one byte, to be written to the robot's state characteristic
   */
  get state() {
    throw new Error("Input.state is abstract and cannot be called directly");
  }

  /**
   * Get the top-most DOM element for this input
   */
  get domElement() {
    throw new Error(
      "Input.domElement is abstract and cannot be called directly",
    );
  }
}

class Joystick extends Input {
  #x = 0;
  #y = 0;
  #el;

  constructor() {
    super();
    this.#el = document.createElement("div");
    this.#el.className = "joystick-zone";

    // nipplejs requires the zone to be in the DOM (needs bounding rect).
    // Defer initialization until the element is mounted.
    const observer = new MutationObserver(() => {
      if (document.contains(this.#el)) {
        observer.disconnect();
        const manager = nipplejs.create({
          zone: this.#el,
          mode: "static",
          position: { left: "50%", top: "50%" },
          size: 120,
          color: "white",
          restOpacity: 0.5,
        });
        manager.on("move", (_evt, data) => {
          const mag = Math.min(data.force, 1);
          this.#x = Math.cos(data.angle.radian) * mag;
          this.#y = Math.sin(data.angle.radian) * mag;
        });
        manager.on("end", () => {
          this.#x = 0;
          this.#y = 0;
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  get state() {
    // See remote.py:Joystick for encoding
    if (this.#x === 0 && this.#y === 0) {
      return 0;
    }
    const angle = Math.atan2(this.#y, this.#x);
    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
    const direction = Math.round((normalizedAngle / (2 * Math.PI)) * 32) % 32;
    const mag3 = Math.round(
      Math.min(Math.sqrt(this.#x ** 2 + this.#y ** 2), 1) * 7,
    );
    
    return ((direction & 0x1f) << 3) | (mag3 & 0x07);
  }

  get domElement() {
    return this.#el;
  }
}

class Button extends Input {
  #el;
  #down = false;
  #pressedEdge = false;
  #releasedEdge = false;
  #latching;

  constructor(color, latching) {
    super();
    this.#latching = latching;
    this.#el = document.createElement("button");
    this.#el.className = `button button-${color}`;

    this.#el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.#el.setPointerCapture(e.pointerId);
      if (this.#latching) {
        this.#down = !this.#down;
        this.#el.classList.toggle("latched", this.#down);
        if (this.#down) {
          this.#pressedEdge = true;
        } else {
          this.#releasedEdge = true;
        }
      } else {
        this.#down = true;
        this.#pressedEdge = true;
      }
    });

    this.#el.addEventListener("pointerup", () => {
      if (!this.#latching) {
        this.#down = false;
        this.#releasedEdge = true;
      }
    });

    this.#el.addEventListener("pointercancel", () => {
      if (!this.#latching && this.#down) {
        this.#down = false;
        this.#releasedEdge = true;
      }
    });
  }

  get state() {
    // See remote.py:Button for encoding
    const byte =
      (this.#down ? 0x01 : 0) |
      (this.#pressedEdge ? 0x02 : 0) |
      (this.#releasedEdge ? 0x04 : 0);
    this.#pressedEdge = false;
    this.#releasedEdge = false;
    return byte;
  }

  get domElement() {
    return this.#el;
  }
}

class Slider extends Input {
  #el;

  constructor(horizontal) {
    super();
    this.#el = document.createElement("input");
    this.#el.type = "range";
    this.#el.min = "0";
    this.#el.max = "255";
    this.#el.value = "0";
    this.#el.className = horizontal
      ? "slider slider-horizontal"
      : "slider slider-vertical";
  }

  get state() {
    // See remote.py:Slider for encoding
    return this.#el.valueAsNumber;
  }

  get domElement() {
    return this.#el;
  }
}
