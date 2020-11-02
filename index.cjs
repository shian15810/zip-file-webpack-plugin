const path = require('path');
const { Compilation, ModuleFilenameHelpers, sources } = require('webpack');
const yazl = require('yazl');

/**
 * Webpack plugin to zip emitted files. Compresses all assets into a zip file.
 * See https://www.npmjs.com/package/zip-file-webpack-plugin
 */
class ZipFilePlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    const options = this.options;

    if (options.pathPrefix && path.isAbsolute(options.pathPrefix)) {
      throw new Error('`pathPrefix` must be a relative path');
    }

    compiler.hooks.compilation.tap(this.constructor.name, (compilation) => {
      // assets from child compilers will be included in the parent
      // so we should not run in child compilers
      if (compilation.compiler.isChild()) return;

      compilation.hooks.processAssets.tapPromise(
        {
          name: this.constructor.name,
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () =>
          new Promise((resolve) => {
            const zipFile = new yazl.ZipFile();

            const pathPrefix = options.pathPrefix ?? '';
            const pathMapper = options.pathMapper ?? ((x) => x);

            // populate the zip file with each asset
            for (const nameAndPath in compilation.assets) {
              if (!compilation.assets.hasOwnProperty(nameAndPath)) continue;

              // match against include and exclude, which may be strings, regexes, arrays of the previous or omitted
              if (
                !ModuleFilenameHelpers.matchObject(
                  { include: options.include, exclude: options.exclude },
                  nameAndPath,
                )
              ) {
                continue;
              }

              const source = compilation.assets[nameAndPath].source();

              zipFile.addBuffer(
                Buffer.isBuffer(source) ? source : Buffer.from(source),
                path.join(pathPrefix, pathMapper(nameAndPath)),
                options.fileOptions,
              );
            }

            zipFile.end(options.zipOptions);

            // accumulate each buffer containing a part of the zip file
            const bufs = [];

            zipFile.outputStream.on('data', (buf) => {
              bufs.push(buf);
            });

            zipFile.outputStream.on('end', () => {
              const defaultOutputPath =
                compilation.options.output.path ??
                path.join(process.cwd(), 'dist');

              // default to webpack's root output path if no path provided
              const outputPath = options.path ?? defaultOutputPath;

              // default to the basename of the output path if no filename provided
              const outputFilename =
                options.filename ?? path.basename(outputPath);

              const extension = '.' + (options.extension ?? 'zip');

              // combine the output path and filename
              const outputPathAndFilename = path.resolve(
                defaultOutputPath, // ...supporting both absolute and relative paths
                outputPath,
                path.basename(outputFilename, '.zip') + extension, // ...and filenames with and without a .zip extension
              );

              // resolve a relative output path with respect to webpack's root output path
              // since only relative paths are permitted for keys in `compilation.assets`
              const relativeOutputPath = path.relative(
                defaultOutputPath,
                outputPathAndFilename,
              );

              // add our zip file to the assets
              compilation.emitAsset(
                relativeOutputPath,
                new sources.RawSource(Buffer.concat(bufs), false),
              );

              resolve();
            });
          }),
      );
    });
  }
}

module.exports = ZipFilePlugin;
