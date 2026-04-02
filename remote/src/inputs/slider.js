export class SliderInput {
  #state = 0;

  constructor(container, { pane = "center" } = {}) {
    const wrap = document.createElement("div");
    wrap.className = "slider-wrap";

    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "255";
    input.value = "0";
    input.className = pane === "bottom" ? "slider-h" : "slider-v";

    wrap.appendChild(input);
    container.appendChild(wrap);

    input.addEventListener("input", () => {
      this.#state = +input.value;
    });
  }

  get state() {
    return this.#state;
  }
}
