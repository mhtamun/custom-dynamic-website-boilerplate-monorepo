import fs from 'node:fs';
import path, { extname } from 'node:path';
import envVariables from './env.js';
import logger from './logger.js';

interface MulterFile {
  originalname: string;
  buffer?: globalThis.Buffer;
  path?: string;
  filename?: string;
  mimetype?: string;
  size?: number;
}

/* eslint-disable no-unused-vars */
interface FileUtil {
  validateFile: (file: MulterFile | null | undefined) => void;
  getFileExtension: (fileName: string) => string;
  getFile: (fileName: string) => string;
  checkFileExists: (fileName: string) => boolean;
  deleteFile: (fileNameWithExtension: string) => Promise<boolean>;
}
/* eslint-enable no-unused-vars */

export const fileUtil: FileUtil = {
  validateFile(file: MulterFile | null | undefined): void {
    if (!file || !file.originalname || (!file.buffer && !file.path)) {
      throw {
        name: 'badRequest',
        message: 'File is required!',
      };
    }
  },

  getFileExtension: (fileName: string): string => {
    return extname(fileName);
  },

  getFile: (fileName: string): string =>
    path.join(envVariables.ATTACHMENT_FOLDER_PATH, path.basename(fileName)),

  checkFileExists: (fileName: string): boolean => {
    try {
      const filePath = path.join(envVariables.ATTACHMENT_FOLDER_PATH, path.basename(fileName));
      return fs.existsSync(filePath);
    } catch (error) {
      logger.error('file.ts: checkFileExists', error);
      throw error;
    }
  },

  deleteFile: (fileNameWithExtension: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const filePath = path.join(
        envVariables.ATTACHMENT_FOLDER_PATH,
        path.basename(fileNameWithExtension),
      );

      fs.unlink(filePath, e => {
        if (e) {
          logger.error('file.ts: deleteFile', e);
          reject(e);
          return;
        }

        resolve(true);
      });
    });
  },
};
