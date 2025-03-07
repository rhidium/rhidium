import { lstatSync, readdirSync } from 'fs';
import path from 'path';

/** Absolute or relative path(s) to the folder/directory that holds your commands */
export type Directories = string | string[];

/** Include utility fallback for some OS's and containers */
const projectRoot = process.env.PWD ?? '~/';

/** Returns the path relative to the project root directory */
const getProjectRelativePath = (source: string) =>
  source.replace(projectRoot, '~');

const jsSourceFileExtensions = ['.js', '.mjs', '.cjs'];

const fileNameFromPath = (filePath: string) =>
  filePath.slice(filePath.lastIndexOf(path.sep) + 1, filePath.length);

/**
 * Returns an array of filePaths when given a target path, and a list of extensions to look for
 */
const getFiles = (
  /** Relative or absolute path to directory to get all files from */
  dirPath: string,
  /** File extension(s) to include when filtering files, including the "." character is optional */
  extensions: string | string[] = jsSourceFileExtensions,
  /** Whether to include Typescript files when Javascript files are included */
  omitTsExtensionForJs = false,
): string[] => {
  let resolvedDirPath = dirPath;
  let resolvedExtensions: string[] = [];

  // First, resolve provided dirPath (relative/absolute)
  if (!path.isAbsolute(dirPath)) resolvedDirPath = path.resolve(dirPath);

  // Next, check if the path points to an existing directory,
  // and return an empty array if not
  if (!lstatSync(resolvedDirPath).isDirectory()) {
    return [];
  }

  // Resolve variable extensions input: string || string[]
  if (typeof extensions === 'string') resolvedExtensions = [extensions];
  else resolvedExtensions = extensions;

  // Include Typescript files when JS files are included,
  // and ts-node-dev is being used
  if (
    omitTsExtensionForJs === false &&
    process.env.TS_NODE_DEV &&
    resolvedExtensions.includes('.js')
  )
    resolvedExtensions.push('.ts');

  const hasTsFiles = resolvedExtensions.includes('.ts');

  // Initialize our response array, holding all found files
  const filePaths = [];

  // Loop over all files in the dirPath, recursively
  for (let filePath of readdirSync(dirPath)) {
    // Resolve the absolute path to the file, and getting
    // file stats from FS
    filePath = path.resolve(dirPath, filePath);
    const stat = lstatSync(filePath);

    // If target is a directory, recursively keep
    // adding function results to the existing array
    if (stat.isDirectory()) filePaths.push(...getFiles(filePath, extensions));
    // Or if the target is a file, and has a whitelisted extension,
    // Include it in the final result
    else if (
      stat.isFile() &&
      resolvedExtensions.find((ext) => filePath.endsWith(ext)) &&
      !filePath
        .slice(filePath.lastIndexOf(path.sep) + 1, filePath.length)
        .startsWith('.')
    ) {
      if (hasTsFiles && filePath.endsWith('.d.ts')) continue;
      filePaths.push(filePath);
    }
  }

  // Finally, return the array of file paths
  return filePaths;
};

const getDirectories = (
  /** Relative or absolute path to directory to get all directories from */
  dirPath: string,
) => {
  let resolvedDirPath = dirPath;

  // First, resolve provided dirPath (relative/absolute)
  if (!path.isAbsolute(dirPath)) resolvedDirPath = path.resolve(dirPath);

  // Next, check if the path points to an existing directory,
  // and return an empty array if not
  if (!lstatSync(resolvedDirPath).isDirectory()) {
    return [];
  }

  // Initialize our response array, holding all found directories
  const dirPaths = [];

  // Loop over all directories in the dirPath, recursively
  for (let filePath of readdirSync(dirPath)) {
    // Resolve the absolute path to the file, and getting
    // file stats from FS
    filePath = path.resolve(dirPath, filePath);
    const stat = lstatSync(filePath);

    // If target is a directory, recursively keep
    // adding function results to the existing array
    if (stat.isDirectory()) dirPaths.push(filePath);
  }

  // Finally, return the array of file paths
  return dirPaths;
};

export class FileUtils {
  static readonly projectRoot = projectRoot;
  static readonly jsSourceFileExtensions = jsSourceFileExtensions;
  static readonly getFiles = getFiles;
  static readonly getDirectories = getDirectories;
  static readonly fileNameFromPath = fileNameFromPath;
  static readonly getProjectRelativePath = getProjectRelativePath;
}
