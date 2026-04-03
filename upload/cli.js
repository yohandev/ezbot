import { SerialPort } from "./serial_adapter";
import { uploadFirmware } from ".";
import {
  intro,
  spinner,
  taskLog,
  confirm,
  isCancel,
  log,
  outro,
  text,
} from "@clack/prompts";
import { setTimeout as sleep } from "node:timers/promises";

async function main() {
  intro(`\x1b[1m\x1b[96mezbot\x1b[0m\x1b[2m firmware uploader\x1b[0m`);
  const prefix = await text({
    message: "Name prefix",
    placeholder: "Robot",
    initialValue: "Robot",
  });
  if (isCancel(prefix)) {
    outro("Cancelled");
    process.exit(0);
  }

  const startRaw = await text({
    message: "Starting number",
    placeholder: "1",
    initialValue: "1",
    validate: (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 0 || !Number.isInteger(n))
        return "Must be a whole number ≥ 0";
    },
  });
  if (isCancel(startRaw)) {
    outro("Cancelled");
    process.exit(0);
  }

  const startNumber = parseInt(startRaw, 10);
  log.info(
    `Boards will be named: \x1b[1m${prefix} #${startNumber}\x1b[0m, \x1b[1m${prefix} #${startNumber + 1}\x1b[0m, \x1b[1m${prefix} #${startNumber + 2}\x1b[0m, ...`,
  );
  log.info("Plug in boards one at a time to begin flashing.");

  let knownPaths = new Set();

  /** @type {Map<string, { name: string }>} */
  const flashedBoards = new Map();
  let robotCount = 0;

  const s = spinner();

  process.on("SIGINT", () => {
    s.clear();
    outro("Buh-bye!");
    process.exit(0);
  });

  s.start("Plug in an ezbot board to get started");

  while (true) {
    await sleep(500);

    const currentPorts = await SerialPort.list([{ usbVendorId: 0x303a }]);
    const currentPaths = new Set(currentPorts.map((p) => p.path));

    const newPaths = [...currentPaths].filter((p) => !knownPaths.has(p));
    knownPaths = currentPaths;

    if (newPaths.length === 0) continue;

    for (const newPath of newPaths) {
      const portInfo = currentPorts.find((p) => p.path === newPath);
      const boardId = portInfo.serialNumber || portInfo.path;

      s.clear();

      if (flashedBoards.has(boardId)) {
        const { name: prevName } = flashedBoards.get(boardId);
        log.warn(`Board ${boardId} was already flashed as "${prevName}".`);

        const shouldReflash = await confirm({
          message: `Reflash ${boardId} as "${prevName}" again?`,
        });

        if (isCancel(shouldReflash) || !shouldReflash) {
          knownPaths = new Set((await SerialPort.list()).map((p) => p.path));
          s.start("Waiting for you to plug in the next ezbot board");
          continue;
        }

        await flashBoard(portInfo, prevName);
      } else {
        const robotName = `${prefix} #${startNumber + robotCount}`;

        const success = await flashBoard(portInfo, robotName);
        if (success) {
          flashedBoards.set(boardId, { name: robotName });
          robotCount++;
        }
      }

      // Re-seed: the board re-enumerates after reset, don't treat it as new
      knownPaths = new Set((await SerialPort.list()).map((p) => p.path));

      s.start("Waiting for you to plug in the next ezbot board");
    }
  }
}

async function flashBoard(portInfo, robotName) {
  const { path, manufacturer, serialNumber } = portInfo;
  const serialPart = serialNumber || path;
  const manufacturerPart = manufacturer ? `"${manufacturer}" ` : "";

  const taskLogger = taskLog({
    title: `Flashing ${path} (${manufacturerPart}${serialPart})`,
    limit: 10,
  });

  try {
    const port = await SerialPort.create(path);
    await uploadFirmware(port, robotName, (line) => taskLogger.message(line));
    taskLogger.success(`Flashed ${serialPart} as "${robotName}"`);
    return true;
  } catch (err) {
    taskLogger.error(err.message);
    return false;
  }
}

main();
