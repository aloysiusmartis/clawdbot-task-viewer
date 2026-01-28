import express from "express";
import { query } from "../db/index.js";
import type { Task } from "../types/task.js";

const router = express.Router();

// GET /api/v1/sessions/:sessionKey/tasks - Fetch all tasks for a session
router.get("/:sessionKey/tasks", async (req, res) => {
  try {
    const { sessionKey } = req.params;

    // First, ensure the session exists
    const sessionResult = await query(
      "SELECT id FROM sessions WHERE session_key = $1",
      [sessionKey]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    const sessionId = sessionResult.rows[0].id;

    // Fetch all tasks for this session
    const tasksResult = await query<Task>(
      `SELECT
        id,
        session_id,
        task_number,
        subject,
        description,
        active_form,
        status,
        priority,
        blocks,
        blocked_by,
        metadata,
        created_at,
        updated_at,
        completed_at
      FROM tasks
      WHERE session_id = $1
      ORDER BY task_number ASC`,
      [sessionId]
    );

    return res.json({
      sessionKey,
      tasks: tasksResult.rows,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// POST /api/v1/sessions/:sessionKey/tasks - Create a new task
router.post("/:sessionKey/tasks", async (req, res) => {
  try {
    const { sessionKey } = req.params;
    const {
      task_number,
      subject,
      description,
      active_form,
      status = "pending",
      priority = 0,
      blocks = [],
      blocked_by = [],
      metadata = {},
    } = req.body;

    // Validate required fields
    if (!task_number || !subject) {
      return res.status(400).json({
        error: "Missing required fields: task_number and subject are required",
      });
    }

    // First, ensure the session exists or create it
    const sessionResult = await query(
      "SELECT id FROM sessions WHERE session_key = $1",
      [sessionKey]
    );

    let sessionId: string;

    if (sessionResult.rows.length === 0) {
      // Create new session
      const newSessionResult = await query(
        `INSERT INTO sessions (session_key, name)
         VALUES ($1, $2)
         RETURNING id`,
        [sessionKey, `Session ${sessionKey}`]
      );
      sessionId = newSessionResult.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
    }

    // Insert the task
    const taskResult = await query<Task>(
      `INSERT INTO tasks (
        session_id,
        task_number,
        subject,
        description,
        active_form,
        status,
        priority,
        blocks,
        blocked_by,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        sessionId,
        task_number,
        subject,
        description,
        active_form,
        status,
        priority,
        blocks,
        blocked_by,
        JSON.stringify(metadata),
      ]
    );

    return res.status(201).json({
      task: taskResult.rows[0],
    });
  } catch (error: unknown) {
    // Handle unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return res.status(409).json({
        error: "Task with this task_number already exists for this session",
      });
    }

    console.error("Error creating task:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
