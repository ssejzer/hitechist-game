import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (!existsSync("dist/sw.js")) throw new Error("Run npm run build first.");
const result = spawnSync(
  "python3",
  [
    "-c",
    `from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
with ZipFile('root-access-hostinger.zip', 'w', ZIP_DEFLATED) as archive:
 for path in sorted(Path('dist').rglob('*')):
  if path.is_file(): archive.write(path, path.relative_to('dist'))
print('Created root-access-hostinger.zip')`,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status;
