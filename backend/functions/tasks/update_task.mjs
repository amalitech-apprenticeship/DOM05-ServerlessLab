import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import {
  PRIORITIES,
  isValidDate,
  getTask,
  applyUpdate,
} from "../shared/tasks.mjs";
import { restartDeadline } from "../shared/deadlines.mjs";
import {
  toTaskResponse,
  verifyUpload,
  deleteAttachment,
} from "../shared/attachments.mjs";

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

    let oldAttachment = null;
    if (input.attachment !== undefined) {
      if (input.attachment === null) {
        if (task.attachment) {
          fields.attachment = null;
          oldAttachment = task.attachment;
        }
      } else {
        const attachment = await verifyUpload(task.id, input.attachment);
        if (!attachment) {
          return json(400, {
            error: "Attachment not found. Upload the file first.",
          });
        }
        fields.attachment = attachment;
        if (task.attachment?.key && task.attachment.key !== attachment.key) {
          oldAttachment = task.attachment;
        }
      }
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
    if (oldAttachment) {
      await deleteAttachment(oldAttachment);
    }

    return json(200, await toTaskResponse(updated));
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
