export class ButtonInput {
  #down = false;
  #pressed = false;
  #released = false;

  constructor(container, { color = "red" } = {}) {
    const btn = document.createElement("button");
    btn.className = `remote-btn remote-btn-${color}`;
    container.appendChild(btn);

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.#down = true;
      this.#pressed = true;
    });
    btn.addEventListener("pointerup", () => {
      this.#down = false;
      this.#released = true;
    });
    btn.addEventListener("pointerleave", () => {
      if (this.#down) {
        this.#down = false;
        this.#released = true;
      }
    });
  }

  // Returns encoded byte and clears edge flags (pressed/released are one-shot).
  //   bit 0 = down, bit 1 = pressed this frame, bit 2 = released this frame
  get state() {
    const s =
      (this.#down     ? 0x01 : 0) |
      (this.#pressed  ? 0x02 : 0) |
      (this.#released ? 0x04 : 0);
    this.#pressed = false;
    this.#released = false;
    return s;
  }
}
