import pkg from './package.json';

const npkg = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    author: pkg.author,
    license: pkg.license,
    repository: pkg.repository,
    dependencies: pkg.dependencies,
    keywords: pkg.keywords,
    main: "./index.js",
    types: "./index.d.ts",
}
console.log(JSON.stringify(npkg, null, 4))

