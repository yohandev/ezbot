import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import child_process from "node:child_process";
import lastModified from "recursive-last-modified";

export const PATH = dirname(fileURLToPath(import.meta.url));

const SRC_PATH = join(PATH, "src");
const MICROPYTHON_BIN = join(PATH, "bin/ESP32_GENERIC_S3-20251209-v1.27.0.bin");

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

/**
 * Bundles the firmware into two .bin files that can be flashed directly
 * to an ESP32S3 in bootloader mode. The binaries are represented as latin1
 * strings.
 *  1. MicroPython runtime
 *  2. LittleFS archive with the firmware's Python files
 *
 * @returns {Promise<{ data: string, address: number }[]>}
 */
export async function build() {
  if (!(await exists(SRC_PATH))) {
    throw new Error("Missing `src/` folder");
  }
  if (!(await exists(MICROPYTHON_BIN))) {
    throw new Error("Missing micropython binary");
  }

  const tmpFile = join(tmpdir(), "ezbot_littlefs.bin");
  const srcEditTime = lastModified(SRC_PATH);

  // Check if the temporary file is outdated
  if (
    !(await exists(tmpFile)) ||
    (await fs.stat(tmpFile)).mtimeMs < srcEditTime
  ) {
    // Re-generate the littlefs archive
    const cmd = `mklittlefs \
      -c "${SRC_PATH}" \
      -p ${FS_PAGE_SIZE} \
      -b ${FS_BLOCK_SIZE} \
      -s ${FS_SIZE} \
      "${tmpFile}"`;

    await exec(cmd, { stdio: "pipe" });
  }
  return [
    {
      address: 0x0,
      data: await fs.readFile(MICROPYTHON_BIN, { encoding: "latin1" }),
    },
    {
      address: FS_ADDRESS,
      data: await fs.readFile(tmpFile, { encoding: "latin1" }),
    },
  ];
}

const exec = promisify(child_process.exec);

async function exists(path) {
  try {
    await fs.access(path, fs.constants.F_OK);
  } catch {
    return false;
  }
  return true;
}

export default { PATH, build };
