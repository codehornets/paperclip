import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

function processSnapshot(pid) {
  const procRoot = `/proc/${pid}`;
  if (!existsSync(procRoot)) return null;
  try {
    const stat = readFileSync(`${procRoot}/stat`, "utf8");
    const closeParen = stat.lastIndexOf(")");
    if (closeParen < 0) throw new Error(`Cannot parse process stat for PID ${pid}`);
    const fieldsAfterCommand = stat.slice(closeParen + 2).trim().split(/\s+/);
    const startTicks = fieldsAfterCommand[19];
    const pgid = Number(execFileSync("ps", ["-o", "pgid=", "-p", String(pid)], { encoding: "utf8" }).trim());
    const cwd = readlinkSync(`${procRoot}/cwd`);
    const command = readFileSync(`${procRoot}/cmdline`, "utf8").replaceAll("\0", " ").trim();
    return { pid, pgid, startTicks, cwd, command };
  } catch {
    // The process can exit between /proc existence and the individual probes.
    // Treat that race as already stopped; never guess a replacement identity.
    return null;
  }
}

function validRunner(snapshot, repoRoot) {
  return snapshot
    && snapshot.pgid === snapshot.pid
    && resolve(snapshot.cwd) === resolve(repoRoot)
    && (snapshot.command.includes("pnpm") || snapshot.command.includes("dev-runner"));
}

async function record(pidFile, pid, repoRoot, instanceId) {
  let snapshot = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    snapshot = processSnapshot(pid);
    if (validRunner(snapshot, repoRoot)) break;
    await sleep(100);
  }
  if (!validRunner(snapshot, repoRoot)) throw new Error(`PID ${pid} is not an isolated Sellhand Paperclip runner`);
  const recordValue = { schemaVersion: 1, ...snapshot, repoRoot: resolve(repoRoot), instanceId };
  writeFileSync(pidFile, `${JSON.stringify(recordValue, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  chmodSync(pidFile, 0o600);
  console.log(`Recorded isolated Sellhand Paperclip runner PID ${pid}`);
}

async function stop(pidFile, repoRoot, instanceId) {
  if (!existsSync(pidFile)) {
    console.log("No owned Sellhand Paperclip runner record found; nothing stopped.");
    return;
  }
  const recordValue = JSON.parse(readFileSync(pidFile, "utf8"));
  if (recordValue.repoRoot !== resolve(repoRoot) || recordValue.instanceId !== instanceId) throw new Error("Runner record does not belong to this Sellhand instance");
  const snapshot = processSnapshot(recordValue.pid);
  if (!snapshot) {
    rmSync(pidFile);
    console.log("Removed stale Sellhand runner record; process was already stopped.");
    return;
  }
  if (!validRunner(snapshot, repoRoot)
      || snapshot.startTicks !== recordValue.startTicks
      || snapshot.pgid !== recordValue.pgid) {
    throw new Error(`Refusing to stop reused or mismatched PID ${recordValue.pid}`);
  }
  process.kill(-snapshot.pgid, "SIGTERM");
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (!processSnapshot(recordValue.pid)) break;
    await sleep(100);
  }
  if (processSnapshot(recordValue.pid)) throw new Error(`Sellhand runner PID ${recordValue.pid} did not stop after SIGTERM`);
  rmSync(pidFile);
  console.log(`Stopped owned Sellhand Paperclip runner PID ${recordValue.pid}`);
}

const [action, pidFile, pidOrRepoRoot, repoRootOrInstance, maybeInstance] = process.argv.slice(2);
if (action === "record") await record(pidFile, Number(pidOrRepoRoot), repoRootOrInstance, maybeInstance);
else if (action === "stop") await stop(pidFile, pidOrRepoRoot, repoRootOrInstance);
else throw new Error("Usage: runner-process.mjs record <file> <pid> <repo-root> <instance> | stop <file> <repo-root> <instance>");
