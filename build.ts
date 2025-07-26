
import { build, file, write } from 'bun';
import dts from 'bun-plugin-dts';

const mjs = await build({
    entrypoints: ['./src/index.ts'],
    plugins: [
        dts({ output:{ noBanner: true }})
    ],
    minify: {
        identifiers: true,
        whitespace: true,
        syntax: true
    },
    external: ['firebase-admin','uuid','zod'],
    naming: 'index.mjs',
    sourcemap: 'none',
    outdir: 'build/dist',
    format: 'esm',
    target: 'bun'
});

const cjs = await build({
    entrypoints: ['./src/index.ts'],
    minify: {
        identifiers: true,
        whitespace: true,
        syntax: true
    },
    external: ['firebase-admin','uuid','zod'],
    naming: 'index.cjs',
    sourcemap: 'none',
    outdir: 'build/dist',
    format: 'cjs',
    target: 'bun'
});

for ( const { path } of [ ...mjs.outputs, ...cjs.outputs ] ) {
    const content = await file( path ).text();
    const lines = content.split('\n').slice( 1, -1 );
    await write( path, lines.join('\n') );
}