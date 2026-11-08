import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { toTask } from "./tasks.mjs";

export const s3 = new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED" });
const BUCKET = process.env.ATTACHMENTS_BUCKET;

export const MAX_SIZE = 10 * 1024 * 1024;
export const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
];

const safeName = (name) =>
  String(name)
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 100) || "file";

export const createUploadUrl = async (taskId, { name, type }) => {
  const key = `tasks/${taskId}/${randomUUID()}/${safeName(name)}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: type }),
    {
      expiresIn: 300,
    },
  );
  return { key, uploadUrl };
};

export const verifyUpload = async (taskId, attachment) => {
  if (
    !attachment ||
    typeof attachment.key !== "string" ||
    !attachment.key.startsWith(`tasks/${taskId}/`)
  ) {
    return null;
  }

  let head;
  try {
    head = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: attachment.key }),
    );
  } catch (error) {
    if (error.name === "NotFound") return null;
    throw error;
  }

  if (head.ContentLength > MAX_SIZE) {
    await deleteAttachment({ key: attachment.key });
    return null;
  }

  return {
    key: attachment.key,
    name: String(attachment.name ?? attachment.key.split("/").pop()).slice(
      0,
      200,
    ),
    type: head.ContentType ?? attachment.type ?? "application/octet-stream",
    size: head.ContentLength,
  };
};

export const deleteAttachment = async (attachment) => {
  if (!attachment?.key) return;
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: attachment.key }),
    );
  } catch (error) {
    console.error("deleteAttachment failed", error);
  }
};

export const toTaskResponse = async (item) => {
  const task = toTask(item);
  delete task.executionArn;

  if (!task.attachment?.key) {
    return { ...task, attachment: null };
  }

  const { key, name, type, size } = task.attachment;
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: `inline; filename="${safeName(name)}"`,
    }),
    { expiresIn: 3600 },
  );
  return { ...task, attachment: { name, type, size, url } };
};
