import type { Compiler, WebpackPluginInstance } from 'webpack';
import type { EndOptions, Options as YazlOptions } from 'yazl';

declare namespace ZipFilePlugin {
  interface FileOptions extends Partial<YazlOptions> {}

  interface ZipOptions extends EndOptions {}

  interface Options {
    /**
     * Output path. Can be relative (to the webpack output path) or absolute.
     * Defaults to the Webpack output path.
     */
    path?: string;

    /**
     * Output file name.
     * Defaults to the basename of `path` option.
     */
    filename?: string;

    /**
     * The file extension to use instead of 'zip'.
     * Defaults to 'zip'.
     */
    extension?: string;

    /**
     * The path prefix for files included in the zip file.
     * Default to no prefix.
     */
    pathPrefix?: string;

    /**
     * Function to map asset paths to new paths.
     */
    pathMapper?: (assetPath: string) => string;

    /**
     * Include file paths or patterns.
     * Defaults to including all files in the webpack output path.
     */
    include?: string | RegExp | ReadonlyArray<string | RegExp>;

    /**
     * Exclude file paths or patterns. Takes precedence over include. Defaults to no excluding.
     */
    exclude?: string | RegExp | ReadonlyArray<string | RegExp>;

    /**
     * File options passed to yazl `addFile`.
     * See https://github.com/thejoshwolfe/yazl#addfilerealpath-metadatapath-options
     */
    fileOptions?: FileOptions;

    /**
     * File options passed to yazl `end`.
     * See https://github.com/thejoshwolfe/yazl#endoptions-finalsizecallback
     */
    zipOptions?: ZipOptions;
  }
}

/**
 * Webpack plugin to zip emitted files. Compresses all assets into a zip file.
 * See https://www.npmjs.com/package/zip-file-webpack-plugin
 */
declare class ZipFilePlugin implements WebpackPluginInstance {
  constructor(options?: ZipFilePlugin.Options);

  apply(compiler: Compiler): void;
}

export default ZipFilePlugin;
