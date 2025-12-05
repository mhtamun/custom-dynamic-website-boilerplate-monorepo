import express, { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { authMiddleware } from '../../middlewares/auth.js';
import { deleteFile, fetchFile, uploadFile } from '../../services/file.js';
import envVariables from '../../utils/env.js';

const router: Router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dirPath = envVariables.ATTACHMENT_FOLDER_PATH;
    // Ensure directory exists
    fs.mkdirSync(dirPath, { recursive: true });
    cb(null, dirPath);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const randomName = crypto.randomBytes(8).toString('hex'); // 16 chars
    cb(null, `${randomName}${fileExtension}`);
  },
});

const upload = multer({
  storage: storage,
});

/**
 * @swagger
 * /files:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: http://localhost:5001/files/a3f9b2c1d4e5f6g7.pdf
 *                     localUrl:
 *                       type: string
 *                       example: http://localhost:5001/files/a3f9b2c1d4e5f6g7.pdf
 *                 message:
 *                   type: string
 *                   example: File uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/files', authMiddleware, upload.single('file'), (req, res, next) => {
  void uploadFile(req, res).catch(next);
});

/**
 * @swagger
 * /files/{fileName}:
 *   get:
 *     summary: Download or view a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: File name (16-character hash + extension)
 *     responses:
 *       200:
 *         description: File content
 *       404:
 *         description: File not found
 */
router.get('/files/:fileName', (req, res, next) => {
  void fetchFile(req, res).catch(next);
});

/**
 * @swagger
 * /files/{fileName}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: File name (16-character hash + extension)
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.delete('/files/:fileName', authMiddleware, (req, res, next) => {
  void deleteFile(req, res).catch(next);
});

export default router;
