import express from "express";
import { readFile } from "fs/promises";
import { query } from "../db/index.js";
import type { TaskFile } from "../types.js";

const router = express.Router();

// GET /api/v1/tasks/:taskId/files - List all files for a task
router.get("/tasks/:taskId/files", async (req, res): Promise<void> => {
  try {
    const { taskId } = req.params;

    // Query the database to get all files for this task
    const filesResult = await query<TaskFile>(
      `SELECT id, task_id, filename, content_type, size_bytes, file_path, created_at
       FROM task_files
       WHERE task_id = $1
       ORDER BY created_at ASC`,
      [taskId]
    );

    res.json({
      taskId,
      files: filesResult.rows,
      count: filesResult.rows.length,
    });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// GET /api/v1/tasks/:taskId/files/:fileId - Serve a file attachment
router.get("/tasks/:taskId/files/:fileId", async (req, res): Promise<void> => {
  try {
    const { taskId, fileId } = req.params;

    // Query the database to get file metadata
    const fileResult = await query<TaskFile>(
      `SELECT id, task_id, filename, content_type, size_bytes, file_path, created_at
       FROM task_files
       WHERE id = $1 AND task_id = $2`,
      [fileId, taskId]
    );

    if (fileResult.rows.length === 0) {
      res.status(404).json({
        error: "File not found",
      });
      return;
    }

    const fileMetadata = fileResult.rows[0];
    const filePath = fileMetadata.file_path;

    try {
      // Read the file from the filesystem
      const fileContent = await readFile(filePath);

      // Set appropriate headers
      res.setHeader("Content-Type", fileMetadata.content_type || "application/octet-stream");
      res.setHeader("Content-Length", fileContent.length);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileMetadata.filename)}"`
      );

      // Send the file
      res.send(fileContent);
    } catch (fsError: unknown) {
      // File not found on filesystem
      if (
        fsError &&
        typeof fsError === "object" &&
        "code" in fsError &&
        fsError.code === "ENOENT"
      ) {
        res.status(404).json({
          error: "File not found on filesystem",
        });
        return;
      }
      throw fsError;
    }
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
