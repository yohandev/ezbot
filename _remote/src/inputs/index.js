export class Input {
  /**
   * Serialize the state into 1-byte. This must be consistent with firmware/src/remote.py
   *
   * @returns {int} 8-bit representation of the current input state
   */
  get state() {
    throw new Error("Missing implementation for Input::state");
  }

  /**
   * Create an input instance from the given metadata
   */
  static #fromMetadata(metadata) {
    
  }
  
  static #fromMetadataInner(metadata) {
    switch (metadata?.["type"]) {
      case "joystick": return new Joystick
      case "button":
      case "slider":
    }
  }
}
