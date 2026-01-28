import express from "express";
import { query } from "../db/index.js";
import type { Task } from "../types/task.js";

const router = express.Router();

interface Session {
  id: string;
  session_key: string;
  name: string;
  project_path: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

// GET /api/v1/sessions - Fetch all active sessions
router.get("/", async (_req, res) => {
  try {
    const sessionsResult = await query<Session>(
      `SELECT
        id,
        session_key,
        name,
        project_path,
        created_at,
        updated_at,
        last_activity_at
      FROM sessions
      ORDER BY last_activity_at DESC`
    );

    return res.json({
      sessions: sessionsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// GET /api/v1/tasks/search - Search historical tasks from the last 30 days
router.get("/search/query", async (req, res) => {
  try {
    const {
      q,
      status,
      priority,
      session_key,
      sort = "created_at",
      order = "DESC",
    } = req.query;

    // Build dynamic query
    const whereConditions = [
      "tasks.created_at >= NOW() - INTERVAL '30 days'",
    ];
    const params: unknown[] = [];
    let paramCount = 1;

    // Add search query filter
    if (q && typeof q === "string" && q.trim()) {
      whereConditions.push(
        `(tasks.subject ILIKE $${paramCount} OR tasks.description ILIKE $${paramCount})`
      );
      params.push(`%${q}%`);
      paramCount++;
    }

    // Add status filter
    if (status && typeof status === "string") {
      whereConditions.push(`tasks.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    // Add priority filter
    if (priority !== undefined && priority !== "") {
      whereConditions.push(`tasks.priority = $${paramCount}`);
      params.push(parseInt(priority as string));
      paramCount++;
    }

    // Add session_key filter
    if (session_key && typeof session_key === "string") {
      whereConditions.push(`sessions.session_key = $${paramCount}`);
      params.push(session_key);
      paramCount++;
    }

    // Validate sort field to prevent SQL injection
    const validSortFields = [
      "created_at",
      "updated_at",
      "priority",
      "subject",
      "status",
    ];
    const sortField = validSortFields.includes(sort as string)
      ? (sort as string)
      : "created_at";

    // Validate order
    const sortOrder =
      order === "ASC" || order === "asc" ? "ASC" : "DESC";

    // Execute search query
    const tasksResult = await query<
      Task & {
        session_key: string;
        session_name: string | null;
      }
    >(
      `SELECT
        tasks.id,
        tasks.session_id,
        tasks.task_number,
        tasks.subject,
        tasks.description,
        tasks.active_form,
        tasks.status,
        tasks.priority,
        tasks.blocks,
        tasks.blocked_by,
        tasks.metadata,
        tasks.created_at,
        tasks.updated_at,
        tasks.completed_at,
        sessions.session_key,
        sessions.name as session_name
      FROM tasks
      JOIN sessions ON tasks.session_id = sessions.id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY tasks.${sortField} ${sortOrder}`,
      params
    );

    return res.json({
      tasks: tasksResult.rows,
      count: tasksResult.rows.length,
    });
  } catch (error) {
    console.error("Error searching tasks:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

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

    // Update session's last_activity_at timestamp
    await query(
      `UPDATE sessions SET last_activity_at = NOW() WHERE id = $1`,
      [sessionId]
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
