export class Log {
  #el;
  #blinkSpan = null;

  constructor(elementId = "log") {
    this.#el = document.getElementById(elementId);
  }

  #stopBlink() {
    if (this.#blinkSpan) {
      this.#blinkSpan.classList.remove("log-blink");
      this.#blinkSpan = null;
    }
  }

  #appendText(text) {
    this.#stopBlink();
    this.#el.appendChild(document.createTextNode(text + "\n"));
    this.#el.scrollTop = this.#el.scrollHeight;
  }

  info(...args) {
    console.log(...args);
    this.#appendText(args.join(" "));
  }

  warn(...args) {
    console.warn(...args);
    this.#appendText(args.join(" "));
  }

  error(...args) {
    console.error(...args);
    this.#appendText(args.join(" "));
  }

  cta(...args) {
    console.log(...args);
    this.#stopBlink();
    const span = document.createElement("span");
    span.className = "log-blink";
    span.textContent = args.join(" ") + "\n";
    this.#el.appendChild(span);
    this.#el.scrollTop = this.#el.scrollHeight;
    this.#blinkSpan = span;
  }

  progress(label) {
    let node = null;
    return (pct) => {
      const filled = Math.round(pct / 5);
      const bar = "#".repeat(filled) + "-".repeat(20 - filled);
      const text = `${label}: [${bar}] ${pct}%\n`;
      if (!node) {
        node = document.createTextNode(text);
        this.#el.appendChild(node);
      } else {
        node.nodeValue = text;
      }
      this.#el.scrollTop = this.#el.scrollHeight;
    };
  }
}
