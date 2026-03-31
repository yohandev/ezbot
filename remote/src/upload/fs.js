/**
 * MicroPython filesystem upload via raw REPL
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class TimeoutError extends Error {
  constructor(msg = "Serial read timeout", partial = null) {
    super(msg);
    this.name = "TimeoutError";
    this.partial = partial;
  }
}

export class MicroPythonFs {
  #port;
  #logger;

  // Serial pump state
  #queue = [];
  #waiters = [];
  #reader = null;
  #pumpPromise = null;
  #closed = false;

  // REPL state
  #ready = false;
  #madeDirs = new Set();

  constructor(port, logger) {
    this.#port = port;
    this.#logger = logger;
  }

  async #startPump() {
    this.#reader = this.#port.readable.getReader();
    try {
      while (!this.#closed) {
        const { value, done } = await this.#reader.read();
        if (done) break;
        for (const byte of value) this.#queue.push(byte);
        const waiters = this.#waiters.splice(0);
        for (const resolve of waiters) resolve();
      }
    } catch {
      // cancelled or closed — exit silently
    } finally {
      this.#reader.releaseLock();
    }
  }

  #discardInput() {
    this.#queue.length = 0;
  }

  async #write(data) {
    const writer = this.#port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  async #readByte(timeoutMs = 1000) {
    if (this.#queue.length > 0) return this.#queue.shift();
    await new Promise((resolve, reject) => {
      const tid = setTimeout(() => {
        const idx = this.#waiters.indexOf(resolve);
        if (idx !== -1) this.#waiters.splice(idx, 1);
        reject(new TimeoutError());
      }, timeoutMs);
      this.#waiters.push(() => {
        clearTimeout(tid);
        resolve();
      });
    });
    if (this.#queue.length === 0) throw new TimeoutError();
    return this.#queue.shift();
  }

  async #readUntil(pattern, timeoutMs = 5000) {
    const patBytes = typeof pattern === "string" ? encoder.encode(pattern) : pattern;
    const result = [];
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0)
        throw new TimeoutError("Timeout waiting for pattern", new Uint8Array(result));
      try {
        const byte = await this.#readByte(remaining);
        result.push(byte);
        if (result.length >= patBytes.length) {
          const tail = result.slice(-patBytes.length);
          if (tail.every((b, i) => b === patBytes[i])) break;
        }
      } catch (e) {
        if (e instanceof TimeoutError) e.partial = new Uint8Array(result);
        throw e;
      }
    }
    return new Uint8Array(result);
  }

  async #execRaw(code) {
    const codeBytes = encoder.encode(code);
    const msg = new Uint8Array(codeBytes.length + 1);
    msg.set(codeBytes);
    msg[codeBytes.length] = 0x04;
    await this.#write(msg);

    let out1;
    try {
      out1 = await this.#readUntil(new Uint8Array([0x04]), 15000);
    } catch (e) {
      if (e instanceof TimeoutError) {
        const partial = e.partial ? decoder.decode(e.partial) : "";
        this.#logger.warn(`[timeout] cmd: ${JSON.stringify(code.slice(0, 60))}  partial: ${JSON.stringify(partial)}`);
      }
      throw e;
    }

    const out1str = decoder.decode(out1.subarray(0, -1)).replace(/^>/, "");
    if (!out1str.startsWith("OK")) {
      this.#logger.warn(`[repl] unexpected response: ${JSON.stringify(out1str.slice(0, 80))}`);
      throw new Error(`Raw REPL error: expected "OK", got: ${JSON.stringify(out1str.slice(0, 40))}`);
    }

    let out2;
    try {
      out2 = await this.#readUntil(new Uint8Array([0x04]), 5000);
    } catch (e) {
      if (e instanceof TimeoutError) {
        const partial = e.partial ? decoder.decode(e.partial) : "";
        this.#logger.warn(`[timeout] waiting for stderr \\x04  partial: ${JSON.stringify(partial)}`);
      }
      throw e;
    }

    const stderr = decoder.decode(out2.subarray(0, -1));
    if (stderr.trim()) throw new Error(`MicroPython error: ${stderr.trim()}`);
  }

  async #ensureReady() {
    if (this.#ready) return;

    if (!this.#port.readable) await this.#port.open({ baudRate: 115200 });
    this.#pumpPromise = this.#startPump();

    this.#logger.info("Entering raw REPL...");
    let entered = false;
    for (let attempt = 0; attempt < 10 && !entered; attempt++) {
      this.#discardInput();
      await this.#write(new Uint8Array([0x03, 0x03])); // interrupt
      await new Promise(r => setTimeout(r, 100));
      await this.#write(new Uint8Array([0x01]));        // raw REPL
      try {
        await this.#readUntil("raw REPL; CTRL-B to exit\r\n>", 2000);
        entered = true;
      } catch (e) {
        const partial = e.partial?.length
          ? JSON.stringify(decoder.decode(e.partial))
          : "(nothing received)";
        this.#logger.warn(`  attempt ${attempt + 1} failed. Got: ${partial}`);
      }
    }
    if (!entered) throw new Error("Failed to enter raw REPL");
    this.#logger.info("Raw REPL ready.");

    await this.#execRaw("import uos");
    this.#ready = true;
  }

  async uploadFile(path, contents, progress) {
    await this.#ensureReady();

    const slash = path.indexOf("/");
    if (slash !== -1) {
      const dir = path.slice(0, slash);
      if (!this.#madeDirs.has(dir)) {
        await this.#execRaw(`try:\n uos.mkdir('/${dir}')\nexcept:pass`);
        this.#madeDirs.add(dir);
      }
    }

    const escaped = JSON.stringify(contents);
    await this.#execRaw(`f=open('/${path}','w')\nf.write(${escaped})\nf.close()`);

    progress(100);
  }

  async close() {
    this.#closed = true;
    try { await this.#reader?.cancel(); } catch {}
    await this.#pumpPromise;
    try { await this.#port.close(); } catch {}
  }
}
