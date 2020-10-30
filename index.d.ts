import { Compiler } from 'webpack';

declare namespace ZipFilePlugin {
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
     * The file extension to use instead of "zip".
     * Defaults to "zip".
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

  interface FileOptions {
    /**
     * Overwrite the last modified time.
     * Defaults to the current date and time.
     */
    mtime?: Date;
    /**
     * UNIX permission bits and file type.
     */
    mode?: number;
    /**
     * Whether to compress the out[ut zip file.
     * When true, the file data will be deflated (compression method 8).
     * When false, the file data will be stored (compression method 0).
     */
    compress?: boolean;
    /**
     * Force ZIP64 format. ZIP64 format is enabled by default where necessary.
     * See https://github.com/thejoshwolfe/yazl#regarding-zip64-support
     */
    forceZip64Format?: boolean;
  }

  interface ZipOptions {
    /**
     * Force ZIP64 format. ZIP64 format is enabled by default where necessary.
     * See https://github.com/thejoshwolfe/yazl#regarding-zip64-support
     */
    forceZip64Format?: boolean;
  }
}

/**
 * Webpack plugin to zip emitted files. Compresses all assets into a zip file.
 * See https://www.npmjs.com/package/zip-file-webpack-plugin
 */
declare class ZipFilePlugin extends Plugin {
  /**
   * @param options Options for ZipFilePlugin.
   */
  constructor(options?: ZipFilePlugin.Options);

  apply(compiler: Compiler): void;
}

export default ZipFilePlugin;
