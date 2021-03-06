import { createWriteStream, readFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import test from 'ava';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import webpack from 'webpack';
import yauzl from 'yauzl';
import ZipFilePlugin from 'zip-file-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const randomPath = () => {
  return join(__dirname, 'dist', String(Math.random()).slice(2));
};

const runWithOptions = ({ path, filename }, options) => {
  return new Promise((resolve, reject) => {
    webpack(
      {
        mode: 'development',
        devtool: false,
        entry: join(__dirname, 'src', 'app'),
        bail: true,
        output: {
          path,
          filename,
        },
        plugins: [new ZipFilePlugin(options)],
      },
      (err, stats) => {
        stats.hasErrors() ? reject(stats.toString()) : resolve(stats);
      },
    );
  });
};

const getZipPath = ({ outputPath, path, filename, extension }) =>
  resolve(
    outputPath,
    path ?? '',
    basename(filename ?? path ?? outputPath, '.zip') +
      '.' +
      (extension ?? 'zip'),
  );

test('default', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out });

  const byeJpeg = readFileSync(join(out, 'subdir', 'bye.jpeg'));
  const chunkJs = readFileSync(join(out, 'chunk.js'), 'utf8');
  const mainJs = readFileSync(join(out, 'main.js'), 'utf8');
  const outZip = readFileSync(getZipPath({ outputPath: out }));

  t.truthy(byeJpeg);
  t.regex(mainJs, /const abc = 'xyz';/);
  t.regex(chunkJs, /const foo = 'bar';/);
  t.truthy(outZip);
});

test('basic', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out, filename: 'bundle.js' });

  const byeJpeg = readFileSync(join(out, 'subdir', 'bye.jpeg'));
  const bundleJs = readFileSync(join(out, 'bundle.js'), 'utf8');
  const chunkJs = readFileSync(join(out, 'chunk.js'), 'utf8');
  const outZip = readFileSync(getZipPath({ outputPath: out }));

  t.truthy(byeJpeg);
  t.regex(bundleJs, /const abc = 'xyz';/);
  t.regex(chunkJs, /const foo = 'bar';/);
  t.truthy(outZip);
});

const unzip = async (zipFilePath, outDirPath) => {
  const zipFile = await new Promise((resolve, reject) => {
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
      err ? reject(err) : resolve(zipFile);
    });
  });

  zipFile.readEntry();

  zipFile.on('entry', (entry) => {
    zipFile.openReadStream(entry, (err, readStream) => {
      if (err) throw err;
      mkdirp.sync(join(outDirPath, dirname(entry.fileName)));
      const writeStream = createWriteStream(join(outDirPath, entry.fileName));
      readStream.pipe(writeStream);
      writeStream.on('close', () => zipFile.readEntry());
    });
  });

  await new Promise((resolve, reject) => {
    zipFile.on('close', resolve);
    zipFile.on('error', reject);
  });
};

test('roundtrip', async (t) => {
  const out = randomPath();
  const outSrc = join(out, 'src');
  const outDst = join(out, 'dst');

  await runWithOptions({ path: outSrc, filename: 'bundle.js' });

  await unzip(getZipPath({ outputPath: outSrc }), outDst);

  t.is(
    Buffer.compare(
      readFileSync(join(outSrc, 'subdir', 'bye.jpeg')),
      readFileSync(join(outDst, 'subdir', 'bye.jpeg')),
    ),
    0,
  );
  t.is(
    Buffer.compare(
      readFileSync(join(outSrc, 'bundle.js')),
      readFileSync(join(outDst, 'bundle.js')),
    ),
    0,
  );
  t.is(
    Buffer.compare(
      readFileSync(join(outSrc, 'chunk.js')),
      readFileSync(join(outDst, 'chunk.js')),
    ),
    0,
  );
});

const roundtrip = async (options) => {
  const out = randomPath();
  const outSrc = join(out, 'src');
  const outDst = join(out, 'dst');

  await runWithOptions({ path: outSrc, filename: 'bundle.js' }, options);

  await unzip(getZipPath({ outputPath: outSrc }), outDst);

  return outDst;
};

test('exclude string', async (t) => {
  const out = await roundtrip({ exclude: 'chunk.js' });

  t.truthy(readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'bundle.js')));
  t.throws(() => readFileSync(join(out, 'chunk.js')));
});

test('include string', async (t) => {
  const out = await roundtrip({ include: 'chunk.js' });

  t.throws(() => readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.throws(() => readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('exclude regex', async (t) => {
  const out = await roundtrip({ exclude: /\.jpeg$/ });

  t.throws(() => readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('include regex', async (t) => {
  const out = await roundtrip({ include: /\.js$/ });

  t.throws(() => readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('multiple excludes', async (t) => {
  const out = await roundtrip({ exclude: [/\.jpeg$/, 'bundle.js'] });

  t.throws(() => readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.throws(() => readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('multiple includes', async (t) => {
  const out = await roundtrip({ include: [/\.jpeg$/, 'bundle.js'] });

  t.truthy(readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'bundle.js')));
  t.throws(() => readFileSync(join(out, 'chunk.js')));
});

test('exclude overrides include', async (t) => {
  const out = await roundtrip({
    include: [/\.jpeg$/, /\.js$/],
    exclude: ['bundle.js'],
  });

  t.truthy(readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.throws(() => readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('exclude dir', async (t) => {
  const out = await roundtrip({ exclude: 'subdir/' });

  t.throws(() => readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('loaders not tested for include', async (t) => {
  const out = await roundtrip({ include: /file/i });

  t.throws(() => readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.throws(() => readFileSync(join(out, 'bundle.js')));
  t.throws(() => readFileSync(join(out, 'chunk.js')));
});

test('loaders not tested for exclude', async (t) => {
  const out = await roundtrip({ exclude: /file/i });

  t.truthy(readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('fileOptions', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    {
      fileOptions: {
        mtime: new Date('2016-01-01Z'),
        mode: 0o100664,
        forceZip64Format: true,
        compress: false,
      },
    },
  );

  t.is(readFileSync(getZipPath({ outputPath: out })).length, 129410);
});

test('zipOptions', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    {
      zipOptions: {
        forceZip64Format: true,
      },
    },
  );

  t.is(readFileSync(getZipPath({ outputPath: out })).length, 106211);
});

test('fileOptions and zipOptions', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    {
      fileOptions: {
        mtime: new Date('2015-01-01Z'),
        mode: 0o100665,
        forceZip64Format: true,
      },
      zipOptions: {
        forceZip64Format: true,
      },
    },
  );

  t.is(readFileSync(getZipPath({ outputPath: out })).length, 106295);
});

test('pathPrefix', async (t) => {
  const out = await roundtrip({ pathPrefix: 'prefix' });

  t.truthy(readFileSync(join(out, 'prefix', 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'prefix', 'bundle.js')));
});

test('pathPrefix - throws on absolute path', async (t) => {
  t.throws(() => {
    const plugin = new ZipFilePlugin({ pathPrefix: '/prefix' });
    plugin.apply();
  });
});

test('pathMapper - jpeg', async (t) => {
  const out = await roundtrip({
    pathMapper: (p) => {
      if (p.endsWith('.jpeg')) return join(dirname(p), 'images', basename(p));
      return p;
    },
  });

  t.truthy(readFileSync(join(out, 'subdir', 'images', 'bye.jpeg')));
  t.throws(() => readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'chunk.js')));
});

test('pathMapper - js', async (t) => {
  const out = await roundtrip({
    pathMapper: (p) => {
      if (p.endsWith('.js')) return join(dirname(p), 'js', basename(p));
      return p;
    },
  });

  t.truthy(readFileSync(join(out, 'subdir', 'bye.jpeg')));
  t.truthy(readFileSync(join(out, 'js', 'bundle.js')));
  t.throws(() => readFileSync(join(out, 'bundle.js')));
  t.truthy(readFileSync(join(out, 'js', 'chunk.js')));
  t.throws(() => readFileSync(join(out, 'chunk.js')));
});

test('naming - default options, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out });
  t.truthy(readFileSync(getZipPath({ outputPath: out })), '.zip exists');
});

test('naming - default options, with webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out, filename: 'bundle.js' });
  t.truthy(readFileSync(getZipPath({ outputPath: out })), '.zip exists');
});

test('naming - specified filename with .zip, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { filename: 'my_app.zip' });
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, filename: 'my_app.zip' })),
    '.zip exists',
  );
});

test('naming - specified filename without .zip, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { filename: 'my_app' });
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, filename: 'my_app' })),
    '.zip exists',
  );
});

test('naming - specified filename with .zip, with webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    { filename: 'my_app.zip' },
  );
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, filename: 'my_app.zip' })),
    '.zip exists',
  );
});

test('naming - specified filename and extension, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { filename: 'file', extension: 'ext' });
  t.truthy(
    readFileSync(
      getZipPath({ outputPath: out, filename: 'file', extension: 'ext' }),
    ),
    '.ext exists',
  );
});

test('naming - specified extension, webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    { extension: 'ext' },
  );
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, extension: 'ext' })),
    '.ext exists',
  );
});

test('naming - specified extension, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { extension: 'ext' });
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, extension: 'ext' })),
    '.ext exists',
  );
});

test('naming - specified relative path and extension, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { path: 'zip', extension: 'ext' });
  t.truthy(
    readFileSync(
      getZipPath({ outputPath: out, path: 'zip', extension: 'ext' }),
    ),
    '.ext exists',
  );
});

test('naming - specified relative path with slash and extension, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { path: './zip', extension: 'ext' });
  t.truthy(
    readFileSync(
      getZipPath({ outputPath: out, path: './zip', extension: 'ext' }),
    ),
    '.ext exists',
  );
});

test('naming - specified relative path, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { path: 'zip' });
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, path: 'zip' })),
    '.zip exists',
  );
});

test('naming - specified relative path with slash, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { path: './zip' });
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, path: './zip' })),
    '.zip exists',
  );
});

test('naming - specified relative path with parent, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: join(out, 'bin') }, { path: '../zip' });
  t.truthy(
    readFileSync(getZipPath({ outputPath: join(out, 'bin'), path: '../zip' })),
    '.zip exists',
  );
});

test('naming - specified absolute path, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { path: join(out, 'zip') });
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, path: join(out, 'zip') })),
    '.zip exists',
  );
});

test('naming - specified relative path, with webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out, filename: 'bundle.js' }, { path: 'zip' });
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, path: 'zip' })),
    '.zip exists',
  );
});

test('naming - specified absolute path, with webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    { path: join(out, 'zip') },
  );
  t.truthy(
    readFileSync(getZipPath({ outputPath: out, path: join(out, 'zip') })),
    '.zip exists',
  );
});

test('naming - both specified, relative, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions({ path: out }, { path: 'zip', filename: 'archive' });
  t.truthy(
    readFileSync(
      getZipPath({ outputPath: out, path: 'zip', filename: 'archive' }),
    ),
    '.zip exists',
  );
});

test('naming - both specified, absolute, no webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out },
    { path: join(out, 'zip'), filename: 'archive' },
  );
  t.truthy(
    readFileSync(
      getZipPath({
        outputPath: out,
        path: join(out, 'zip'),
        filename: 'archive',
      }),
    ),
    '.zip exists',
  );
});

test('naming - both specified, relative, with webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    { path: 'zip', filename: 'archive' },
  );
  t.truthy(
    readFileSync(
      getZipPath({ outputPath: out, path: 'zip', filename: 'archive' }),
    ),
    '.zip exists',
  );
});

test('naming - both specified, absolute, with webpack filename', async (t) => {
  const out = randomPath();
  await runWithOptions(
    { path: out, filename: 'bundle.js' },
    { path: join(out, 'zip'), filename: 'archive' },
  );
  t.truthy(
    readFileSync(
      getZipPath({
        outputPath: out,
        path: join(out, 'zip'),
        filename: 'archive',
      }),
    ),
    '.zip exists',
  );
});

test.after(() => {
  rimraf.sync(join(__dirname, 'dist'));
});
