import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import {
  STATUSES,
  MEMBER_STATUS_TRANSITIONS,
  STATUS_LABELS,
  toTask,
  getTask,
  applyUpdate,
} from "../shared/tasks.mjs";
import { notify } from "../shared/notify.mjs";
import {
  startDeadline,
  stopDeadline,
  restartDeadline,
} from "../shared/deadlines.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);

    const input = parseBody(event);
    if (!input || !STATUSES.includes(input.status)) {
      return json(400, {
        error: `status must be one of: ${STATUSES.join(", ")}`,
      });
    }

    const task = await getTask(event.pathParameters.taskId);
    if (!task || (!user.isAdmin && task.assigneeId !== user.id)) {
      return json(404, { error: "Task not found" });
    }
    if (task.archivedAt) {
      return json(409, { error: "Archived tasks are read-only" });
    }
    if (task.status === input.status) {
      return json(200, toTask(task));
    }

    const allowed = MEMBER_STATUS_TRANSITIONS[task.status] ?? [];
    if (!user.isAdmin && !allowed.includes(input.status)) {
      return json(409, {
        error: `Can't change status from ${task.status} to ${input.status}`,
      });
    }

    const entry = {
      at: new Date().toISOString(),
      by: user.id,
      action: "status_changed",
      status: input.status,
    };
    const updated = await applyUpdate(
      task.id,
      { status: input.status },
      entry,
      {
        condition: "#status = :current",
        conditionValues: { ":current": task.status },
      },
    );
    if (input.status === "completed") {
      await stopDeadline(updated);
    } else if (task.status === "completed") {
      await restartDeadline(updated);
    }
    if (!user.isAdmin) {
      await notify({
        recipientId: "admin",
        type: "update",
        taskId: task.id,
        title: `Status update: ${task.title}`,
        message: `${user.name || "A team member"} moved "${task.title}" from ${STATUS_LABELS[task.status]} to ${STATUS_LABELS[input.status]}.`,
      });
    }
    return json(200, toTask(updated));
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return json(409, {
        error: "The task was changed by someone else, try again",
      });
    }
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
