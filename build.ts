import { writeFileSync, readFileSync } from 'node:fs';
import pkg from './package.json';

const npkg = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    author: pkg.author,
    license: pkg.license,
    repository: pkg.repository,
    peerDependencies: pkg.peerDependencies,
    keywords: pkg.keywords,
    main: "./cjs/index.js",
    module: "./esm/index.js",
    types: "./types/index.d.ts",
    exports: {
        ".": {
            types: "./types/index.d.ts",
            import: "./esm/index.js",
            require: "./cjs/index.js"
        }
    },
}

writeFileSync('./lib/package.json', `${JSON.stringify(npkg, null, 4)}\n`, 'utf-8');
writeFileSync('./lib/esm/package.json', '{"type":"module"}\n', 'utf-8');
writeFileSync('./lib/.npmrc', readFileSync('./.npmrc').toString());

