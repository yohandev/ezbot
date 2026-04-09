/**
 * Project-wide build file. This outputs the complete website,
 * ready for hosting on a CDN, in `out/`.
 *
 * This includes:
 *  - `out/remote`: Entry point for the BLE remote control
 *  - `out/upload`: Bundles `esptool` + the firmware as a binary string
 *  - `out/cli.mjs`: Bundles `esptool` + the firmware + a CLI for rapidly flashing many devices
 *  - A bunch of other files, depending on how esbuild decided to split the bundle
 *
 * The firmware flashing is not intended to be its own artifact, rather users should
 * upload the firmware to their boards using the web UI (a sub-menu in the remote control).
 * Alternatively, the CLI is available to flash many boards at once (it can bypass WebSerial
 * permission issues, so it's effectively a lot faster). This is offered as a one-command'er
 * which `curl`s the CLI script and runs it.
 *
 * The firmware uploader (`out/upload`) is a separate file since it's quite large (10 MB
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
    format: "esm",
    plugins: [firmwarePlugin, rebuildLogPlugin],
  };

  // CLI (node.js)
  await esbuild.build({
    entryPoints: ["src/cli/index.js"],
    outfile: "out/cli.mjs",
    platform: "node",
    target: ["node10.4"],
    external: ["serialport"],
    ...options,
  });

  // Remote control (web)
  const webOptions = {
    entryPoints: [
      "src/remote/index.js",
      "src/upload/index.js",
      "src/index.html",
      "src/styles.css",
      "src/cli/install.sh",
      "src/cli/install.ps1",
    ],
    outdir: "out",
    platform: "browser",
    target: ["chrome89", "firefox90", "safari15", "edge89"],
    splitting: true,
    loader: {
      ".html": "copy",
      ".sh": "copy",
      ".ps1": "copy",
      ".svg": "file",
      ".webp": "file",
      ".jpg": "file",
      ".png": "file",
      ".mp4": "file",
    },
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
    await esbuild.build(webOptions);
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
        loader: "json",
        watchDirs: [firmware.PATH],
        watchFiles: await firmware.watchedFiles(),
      };
    });
  },
};

/**
 * @type {esbuild.Plugin}
 */
const rebuildLogPlugin = {
  name: "rebuild-log",
  setup(build) {
    build.onEnd(() => {
      console.log(`[${new Date().toLocaleTimeString()}] rebuilt`);
    });
  },
};

build();
