import express from "express";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { query } from "../db/index.js";
import type { TaskFile } from "../types.js";
import type { Task } from "../types/task.js";

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

// POST /api/v1/tasks/:taskId/files - Add a file attachment to a pending task
router.post("/tasks/:taskId/files", express.raw({ type: "*/*", limit: "1mb" }), async (req, res): Promise<void> => {
  try {
    const { taskId } = req.params;
    const filename = req.headers["x-filename"] as string || "attachment";
    const contentType = req.headers["content-type"] || "application/octet-stream";

    // Verify task exists and is pending
    const taskCheck = await query<Task>(
      `SELECT t.id, t.status, t.task_number, s.session_key
       FROM tasks t
       JOIN sessions s ON t.session_id = s.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (taskCheck.rows[0].status !== "pending") {
      res.status(400).json({ error: "Can only add files to pending tasks" });
      return;
    }

    const task = taskCheck.rows[0];
    const sessionKey = (task as unknown as { session_key: string }).session_key;
    const taskNumber = task.task_number;

    // Create file path
    const fileDir = join("/data/files", sessionKey, String(taskNumber));
    const filePath = join(fileDir, filename);

    // Ensure directory exists
    await mkdir(fileDir, { recursive: true });

    // Write file
    const fileContent = req.body as Buffer;
    await writeFile(filePath, fileContent);

    // Insert file record
    const fileResult = await query<TaskFile>(
      `INSERT INTO task_files (task_id, filename, content_type, size_bytes, file_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, filename, contentType, fileContent.length, filePath]
    );

    res.status(201).json({
      file: fileResult.rows[0],
    });
  } catch (error) {
    console.error("Error adding file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/tasks/:taskId/files/:fileId - Remove a file from a pending task
router.delete("/tasks/:taskId/files/:fileId", async (req, res): Promise<void> => {
  try {
    const { taskId, fileId } = req.params;

    // Verify task exists and is pending
    const taskCheck = await query<Task>(
      "SELECT id, status FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (taskCheck.rows[0].status !== "pending") {
      res.status(400).json({ error: "Can only remove files from pending tasks" });
      return;
    }

    // Get file path before deleting
    const fileResult = await query<TaskFile>(
      "SELECT file_path FROM task_files WHERE id = $1 AND task_id = $2",
      [fileId, taskId]
    );

    if (fileResult.rows.length === 0) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const filePath = fileResult.rows[0].file_path;

    // Delete from database
    await query("DELETE FROM task_files WHERE id = $1", [fileId]);

    // Try to delete from filesystem (don't fail if file doesn't exist)
    try {
      await unlink(filePath);
    } catch {
      // File might already be gone, ignore
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error removing file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
