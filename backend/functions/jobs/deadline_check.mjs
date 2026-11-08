import { getTask, STATUS_LABELS } from "../shared/tasks.mjs";
import { notify } from "../shared/notify.mjs";

export const handler = async (event) => {
  const { taskId, assigneeId, dueDate, kind } = event;
  const task = await getTask(taskId);

  const stillRelevant =
    task &&
    !task.archivedAt &&
    task.status !== "completed" &&
    task.assigneeId === assigneeId &&
    task.dueDate === dueDate;

  if (!stillRelevant) {
    console.log(JSON.stringify({ skipped: true, taskId, kind }));
    return { sent: false };
  }

  const status = STATUS_LABELS[task.status];

  if (kind === "reminder") {
    await notify({
      recipientId: assigneeId,
      type: "deadline",
      taskId,
      title: `Deadline approaching: ${task.title}`,
      message: `"${task.title}" is due by the end of ${dueDate}. Current status: ${status}.`,
    });
  } else {
    const title = `Task overdue: ${task.title}`;
    const message = `"${task.title}" was due ${dueDate} and isn't completed yet (status: ${status}).`;
    await notify({ recipientId: assigneeId, type: "deadline", taskId, title, message });
    await notify({ recipientId: "admin", type: "deadline", taskId, title, message });
  }

  return { sent: true };
};