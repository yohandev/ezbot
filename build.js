/**
 * Project-wide build file. This outputs the complete website,
 * ready for hosting on a CDN, in `out/`.
 *
 * This includes:
 *  - `out/index.html`: Entry point for the BLE remote control
 *  - `out/index.js`: Entry point for the BLE remote control
 *  - `out/upload.js`: Bundles `esptool` + the firmware as a binary string
 *  - `out/cli.cjs`: Bundles `esptool` + the firmware + a CLI for rapidly flashing many devices
 *
 * The firmware flashing is not intended to be its own artifact, rather users should
 * upload the firmware to their boards using the web UI (a sub-menu in the remote control).
 * Alternatively, the CLI is available to flash many boards at once (it can bypass WebSerial
 * permission issues, so it's effectively a lot faster). This is offered as a one-command'er
 * which `curl`s the CLI script and runs it.
 *
 * The firmware uploader (`out/upload.js`) is a separate file since it's quite large (10 MB
 * uncompressed) and isn't necessary every time.
 */
import esbuild from "esbuild";
import firmware from "./firmware/build.js";

async function build() {
  const serve = process.argv.includes("--serve");
  const options = {
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ["chrome89", "firefox90", "safari15", "edge89", "node10.4"],
    plugins: [firmwarePlugin],
  };

  // CLI (node.js)
  await esbuild.build({
    entryPoints: ["src/cli/index.js"],
    outfile: "out/cli.cjs",
    platform: "node",
    external: ["serialport"],
    ...options,
  });

  // Remote control (web)
  const webOptions = {
    entryPoints: ["src/remote/index.js", "src/upload/index.js"],
    outdir: "out",
    platform: "browser",
    loader: { ".html": "copy" },
    ...options,
  };
  if (serve) {
    const ctx = await esbuild.context(webOptions);

    await ctx.watch();
    await ctx.serve({
      servedir: "out",
      port: 8000,
    });

    console.log(
      "Running at http://127.0.0.1:8000 (note: CLI won't be auto-rebuilt)",
    );
  } else {
    await esbuild.build(options);
  }
}

/**
 * @type {esbuild.Plugin}
 */
const firmwarePlugin = {
  name: "firmware",
  setup(build) {
    build.onResolve({ filter: /^>>firmware<<$/ }, (_) => {
      return {
        path: firmware.PATH,
        namespace: "firmware-ns",
      };
    });
    build.onLoad({ filter: /.*/, namespace: "firmware-ns" }, async (_) => {
      return {
        contents: JSON.stringify(await firmware.build()),
        loader: "binary",
        watchDirs: [firmware.PATH],
      };
    });
  },
};

build();
