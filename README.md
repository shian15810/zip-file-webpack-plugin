# zip-file-webpack-plugin

Webpack plugin to zip emitted files. Compresses all assets into a zip file.

A fork of [`zip-webpack-plugin`](https://github.com/erikdesjardins/zip-webpack-plugin), with a few notable changes:

- Supports [Webpack 5](https://webpack.js.org/blog/2020-10-10-webpack-5-release/).
- Provides built-in [TypeScript declarations](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html).

## Installation

`npm install --save-dev zip-file-webpack-plugin`

## Usage

**webpack.config.js**

```js
import ZipFilePlugin from 'zip-file-webpack-plugin';

/**
 * @type {import('webpack').Configuration}
 */
const config = {
  // ...
  output: {
    path: path.join(__dirname, 'dist'),
  },
  // ...
  plugins: [
    new ZipFilePlugin({
      // OPTIONAL: defaults to the Webpack output path (above)
      // can be relative (to Webpack output path) or absolute
      path: 'zip',

      // OPTIONAL: defaults to the basename of `path` option
      filename: 'my_app.zip',

      // OPTIONAL: defaults to 'zip'
      // the file extension to use instead of 'zip'
      extension: 'ext',

      // OPTIONAL: defaults to the empty string
      // the prefix for the files included in the zip file
      pathPrefix: 'relative/path',

      // OPTIONAL: defaults to the identity function
      // a function mapping asset paths to new paths
      pathMapper: (assetPath) => {
        // put all pngs in an `images` subdir
        if (assetPath.endsWith('.png')) {
          return path.join(
            path.dirname(assetPath),
            'images',
            path.basename(assetPath),
          );
        }
        return assetPath;
      },

      // OPTIONAL: defaults to including everything
      // can be a string, a RegExp, or an array of strings and RegExps
      include: [/\.js$/],

      // OPTIONAL: defaults to excluding nothing
      // can be a string, a RegExp, or an array of strings and RegExps
      // if a file matches both include and exclude, exclude takes precedence
      exclude: [/\.png$/, /\.html$/],

      // yazl Options

      // OPTIONAL: see https://github.com/thejoshwolfe/yazl#addfilerealpath-metadatapath-options
      fileOptions: {
        mtime: new Date(),
        mode: 0o100664,
        compress: true,
        forceZip64Format: false,
      },

      // OPTIONAL: see https://github.com/thejoshwolfe/yazl#endoptions-finalsizecallback
      zipOptions: {
        forceZip64Format: false,
      },
    }),
  ],
  // ...
};

export default config;
```
