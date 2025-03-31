import { lstatSync, readdirSync } from 'fs';
import path from 'path';

const projectRoot = process.env.PWD ?? '~/';

const javascriptExtensions = ['.js', '.mjs', '.cjs'];

const relativeProjectPath = (filePath: string) =>
  filePath.replace(projectRoot, '.');

const fileNameFromPath = (filePath: string) =>
  filePath.slice(filePath.lastIndexOf(path.sep) + 1, filePath.length);

const getFiles = (
  /** Relative or absolute path to directory to get all files from */
  dirPath: string,
  /** File extension(s) to include when filtering files, including the "." character is optional */
  extensions: string | string[] = javascriptExtensions,
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

const getDirectories = (dirPath: string) => {
  const dirPaths = [];
  let resolvedDirPath = dirPath;

  if (!path.isAbsolute(dirPath)) resolvedDirPath = path.resolve(dirPath);

  if (!lstatSync(resolvedDirPath).isDirectory()) {
    return [];
  }

  for (let filePath of readdirSync(dirPath)) {
    filePath = path.resolve(dirPath, filePath);
    const stat = lstatSync(filePath);

    if (stat.isDirectory()) dirPaths.push(filePath);
  }

  return dirPaths;
};

class FileUtils {
  /**
   * The path for this project's root directory,
   * including the trailing slash and fallbacks
   * for some OS's and containers
   */
  static readonly projectRoot = projectRoot;
  /**
   * List of file extensions for Javascript source files
   */
  static readonly javascriptExtensions = javascriptExtensions;
  /**
   * Get the relative path of a file from the project root
   * @param filePath The file path to get the relative path for
   * @returns The relative path of the file from the project root
   */
  static readonly relativeProjectPath = relativeProjectPath;
  /**
   * Extracts the file name from a given file path,
   * be it relative or absolute
   * @param filePath The file path to extract the name from
   * @returns The file name
   */
  static readonly fileNameFromPath = fileNameFromPath;
  /**
   * Recursively get all files in a directory, including subdirectories
   * @param dirPath The target directory to search for files in
   * @param extensions The file extensions to include when filtering files
   * @param omitTsExtensionForJs Whether to include Typescript files when Javascript files are included
   * @returns An array of file paths found in the target directory
   */
  static readonly getFiles = getFiles;
  /**
   * Get all directories in a directory, does not include nested/subdirectories
   * @param dirPath The target directory to search for directories in
   * @returns An array of directory paths found in the target directory
   */
  static readonly getDirectories = getDirectories;
}

/** Absolute or relative path(s) to the folder/directories that hold your components */
type Directories = string | string[];

export { FileUtils, type Directories };
