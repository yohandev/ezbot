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
  get state() {
    // See remote.py:Joystick for encoding
    // TODO
  }
  
  // TODO: use nipplejs for this
}

class Button extends Input {
  get state() {
    // See remote.py:Button for encoding
    // TODO
  }
}

class Slider extends Input {
  constructor(horizontal) {
    // TODO
  }

  get state() {
    // See remote.py:Slider for encoding
    // TODO
  }
}
