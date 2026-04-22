import fs from 'node:fs/promises';
import path from 'node:path';

const prismaClientPath = path.resolve('dist', 'generated', 'prisma', 'client.js');

async function fixImports() {
  let content = await fs.readFile(prismaClientPath, 'utf8');

  content = content
    .replace(/from "\.\/enums"/g, 'from "./enums.js"')
    .replace(/export \* as \$Enums from ['"]\.\/enums['"]/g, 'export * as $Enums from "./enums.js"')
    .replace(/from "\.\/internal\/class"/g, 'from "./internal/class.js"')
    .replace(/from "\.\/internal\/prismaNamespace"/g, 'from "./internal/prismaNamespace.js"');

  await fs.writeFile(prismaClientPath, content, 'utf8');
  console.log('Patched Prisma client imports for Node ESM');
}

fixImports().catch((error) => {
  console.error('Failed to patch Prisma client imports:', error);
  process.exit(1);
});