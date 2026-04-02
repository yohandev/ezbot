import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import lastModified from "recursive-last-modified";
import { execSync } from "node:child_process";
import * as esbuild from "esbuild";

// Partition magic numbers specifically for the ESP32S3 WROOM
//
// I got these using the Micropython REPL itself:
// import esp32
//
// vfs = esp32.Partition.find(esp32.Partition.TYPE_DATA, label='vfs')[0]
// print(vfs)
const FS_SIZE = 6291456; // 6MB
const FS_PAGE_SIZE = 256;
const FS_BLOCK_SIZE = 4096;
const FS_ADDRESS = 0x200000;

async function build() {
  const serve = process.argv.includes("--serve");
  const options = {
    entryPoints: ["src/index.js"],
    outfile: "www/index.js",
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ["chrome89", "firefox90", "safari15", "edge89"],
    loader: { ".bin": "file" },
    plugins: [mklittlefsPlugin],
  };

  if (serve) {
    const ctx = await esbuild.context(options);

    await ctx.watch();
    await ctx.serve({
      servedir: "www",
      port: 8000,
    });

    console.log("Running at http://127.0.0.1:8000");
  } else {
    await esbuild.build(options);
  }
}

// Plugin that bundles a folder as a littleFS binary
const mklittlefsPlugin = {
  name: "mklittlefs",
  setup(build) {
    // 1. Intercept the import and generate a JS object (metadata + binary URL)
    build.onResolve({ filter: /^vfs:/ }, (args) => {
      const relativeFolder = args.path.replace(/^vfs:/, "");
      const absoluteFolder = path.resolve(args.resolveDir, relativeFolder);

      return {
        path: absoluteFolder,
        namespace: "vfs-meta",
        pluginData: { absoluteFolder },
      };
    });

    build.onLoad({ filter: /.*/, namespace: "vfs-meta" }, (args) => {
      const folderPath = args.pluginData.absoluteFolder;

      // Create a virtual JS module that calls step 2
      const internalBinImport = `vfs-bin:${folderPath}`;
      const contents = `
        import binUrl from ${JSON.stringify(internalBinImport)};

        export default {
          binUrl,
          size: ${FS_SIZE},
          pageSize: ${FS_PAGE_SIZE},
          blockSize: ${FS_BLOCK_SIZE},
          address: ${FS_ADDRESS}
        };
      `;

      return { contents, loader: "js" };
    });

    // 2. Intercept the binary import and run mklittlefs
    build.onResolve({ filter: /^vfs-bin:/ }, (args) => {
      const absoluteFolder = args.path.replace(/^vfs-bin:/, "");

      return {
        path: absoluteFolder + ".bin", // Append .bin so the file loader names it correctly
        namespace: "vfs-bin",
        pluginData: { absoluteFolder },
      };
    });

    build.onLoad({ filter: /.*/, namespace: "vfs-bin" }, async (args) => {
      const folderPath = args.pluginData.absoluteFolder;

      if (!fs.existsSync(folderPath)) {
        return { errors: [{ text: `Directory not found: ${folderPath}` }] };
      }

      const tempFile = path.join(
        os.tmpdir(),
        `vfs_${crypto.hash("sha256", folderPath)}`,
      );
      const folderEditTime = lastModified(folderPath);

      if (
        !fs.existsSync(tempFile) ||
        fs.statSync(tempFile).mtimeMs < folderEditTime
      ) {
        try {
          const cmd = `mklittlefs \
            -c "${folderPath}" \
            -p ${FS_PAGE_SIZE} \
            -b ${FS_BLOCK_SIZE} \
            -s ${FS_SIZE} \
            "${tempFile}"`;
          execSync(cmd, { stdio: "pipe" });
        } catch (error) {
          return {
            errors: [
              {
                text: `mklittlefs failed: ${error.message}\n${error.stdout?.toString()}`,
              },
            ],
          };
        }
      }

      // Return the temporary file
      return {
        contents: fs.readFileSync(tempFile),
        loader: "file",
        watchDirs: [folderPath],
      };
    });
  },
};

build();
