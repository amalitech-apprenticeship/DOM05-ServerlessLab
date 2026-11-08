import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import { toTask, getTask, applyUpdate } from "../shared/tasks.mjs";
import { notifyAssigned } from "../shared/notify.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can assign tasks" });
    }

    const input = parseBody(event);
    if (!input || !("assigneeId" in input)) {
      return json(400, {
        error: "assigneeId is required (a user id, or null to unassign)",
      });
    }

    const assigneeId = input.assigneeId;
    if (
      assigneeId !== null &&
      (typeof assigneeId !== "string" || !assigneeId)
    ) {
      return json(400, { error: "assigneeId must be a user id or null" });
    }

    const task = await getTask(event.pathParameters.taskId);
    if (!task) {
      return json(404, { error: "Task not found" });
    }
    if (task.archivedAt) {
      return json(409, { error: "Archived tasks are read-only" });
    }
    if ((task.assigneeId ?? null) === assigneeId) {
      return json(200, toTask(task));
    }

    const entry = {
      at: new Date().toISOString(),
      by: user.id,
      action: "assigned",
      assigneeId,
    };
    const updated = assigneeId
      ? await applyUpdate(task.id, { assigneeId }, entry)
      : await applyUpdate(task.id, {}, entry, { remove: ["assigneeId"] });

    if (assigneeId) {
      await notifyAssigned(updated);
    }
    return json(200, toTask(updated));
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
