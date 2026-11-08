import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import {
  PRIORITIES,
  isValidDate,
  toTask,
  getTask,
  applyUpdate,
} from "../shared/tasks.mjs";
import {
  startDeadline,
  stopDeadline,
  restartDeadline,
} from "../shared/deadlines.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can edit tasks" });
    }

    const input = parseBody(event);
    if (!input) {
      return json(400, { error: "Body must be a JSON object" });
    }

    const task = await getTask(event.pathParameters.taskId);
    if (!task) {
      return json(404, { error: "Task not found" });
    }
    if (task.archivedAt) {
      return json(409, { error: "Archived tasks are read-only" });
    }

    const fields = {};

    if (input.title !== undefined) {
      const title = typeof input.title === "string" ? input.title.trim() : "";
      if (!title) {
        return json(400, { error: "title cannot be empty" });
      }
      fields.title = title.slice(0, 200);
    }
    if (input.description !== undefined) {
      fields.description = String(input.description ?? "").slice(0, 5000);
    }
    if (input.category !== undefined) {
      fields.category = String(input.category ?? "").slice(0, 100);
    }
    if (input.priority !== undefined) {
      if (!PRIORITIES.includes(input.priority)) {
        return json(400, {
          error: `priority must be one of: ${PRIORITIES.join(", ")}`,
        });
      }
      fields.priority = input.priority;
    }
    if (input.dueDate !== undefined) {
      if (!isValidDate(input.dueDate)) {
        return json(400, { error: "dueDate must be YYYY-MM-DD" });
      }
      fields.dueDate = input.dueDate;
    }

    if (Object.keys(fields).length === 0) {
      return json(400, { error: "Nothing to update" });
    }

    const entry = {
      at: new Date().toISOString(),
      by: user.id,
      action: "edited",
    };
    const updated = await applyUpdate(task.id, fields, entry);
    if (fields.dueDate && fields.dueDate !== task.dueDate) {
      await restartDeadline(updated);
    }

    return json(200, toTask(updated));
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
