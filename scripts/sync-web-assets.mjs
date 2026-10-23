import {cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=new URL('../apps/web/public/',import.meta.url);
const target=new URL('../public/',import.meta.url);
await mkdir(target,{recursive:true});
await cp(fileURLToPath(source),fileURLToPath(target),{recursive:true});
