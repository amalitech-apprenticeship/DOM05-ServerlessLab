import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

export const sns = new SNSClient({});
const TOPIC_ARN = process.env.TOPIC_ARN;

const toSubject = (title) =>
  title
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 100) || "Orvia notification";

export const notify = async ({
  recipientId,
  type,
  taskId = null,
  title,
  message,
}) => {
  try {
    const data = { recipientId, type, taskId, title, message };

    await sns.send(
      new PublishCommand({
        TopicArn: TOPIC_ARN,
        Subject: toSubject(title),
        MessageStructure: "json",
        Message: JSON.stringify({
          default: JSON.stringify(data),
          email: `${title}\n\n${message}`,
        }),
        MessageAttributes: {
          recipientId: { DataType: "String", StringValue: recipientId },
        },
      }),
    );
  } catch (error) {
    console.error("notify failed", error);
  }
};

export const notifyAssigned = (task) =>
  notify({
    recipientId: task.assigneeId,
    type: "assignment",
    taskId: task.id,
    title: `New task assigned: ${task.title}`,
    message: `You've been assigned "${task.title}", due ${task.dueDate} (priority: ${task.priority}).`,
  });
