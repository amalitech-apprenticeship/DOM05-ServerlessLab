import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getUser } from "../shared/auth.mjs";
import { json } from "../shared/http.mjs";
import { db, TABLE_NAME, STATUSES, isValidDate, toTask } from "../shared/tasks.mjs";

const findTasks = async ({ assigneeId, status, dueBefore, dueAfter }) => {
  const names = {};
  const values = {};
  const keyParts = [];
  const filterParts = [];
  let index;

  let dueCondition;
  if (dueAfter || dueBefore) {
    names["#dueDate"] = "dueDate";
    if (dueAfter) values[":dueAfter"] = dueAfter;
    if (dueBefore) values[":dueBefore"] = dueBefore;
    dueCondition =
      dueAfter && dueBefore
        ? "#dueDate BETWEEN :dueAfter AND :dueBefore"
        : dueAfter
          ? "#dueDate >= :dueAfter"
          : "#dueDate <= :dueBefore";
  }

  if (assigneeId) {
    index = "byAssignee";
    names["#assigneeId"] = "assigneeId";
    values[":assigneeId"] = assigneeId;
    keyParts.push("#assigneeId = :assigneeId");
    if (status) {
      names["#status"] = "status";
      values[":status"] = status;
      filterParts.push("#status = :status");
    }
  } else if (status) {
    index = "byStatus";
    names["#status"] = "status";
    values[":status"] = status;
    keyParts.push("#status = :status");
  }

  if (dueCondition) {
    (index ? keyParts : filterParts).push(dueCondition);
  }

  const params = { TableName: TABLE_NAME };
  if (Object.keys(names).length) params.ExpressionAttributeNames = names;
  if (Object.keys(values).length) params.ExpressionAttributeValues = values;
  if (index) {
    params.IndexName = index;
    params.KeyConditionExpression = keyParts.join(" AND ");
  }
  if (filterParts.length) params.FilterExpression = filterParts.join(" AND ");

  const Command = index ? QueryCommand : ScanCommand;
  const items = [];
  do {
    const result = await db.send(new Command(params));
    items.push(...result.Items);
    params.ExclusiveStartKey = result.LastEvaluatedKey;
  } while (params.ExclusiveStartKey);

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

export const handler = async (event) => {
  try {
    const user = getUser(event);
    const query = event.queryStringParameters ?? {};

    if (query.status && !STATUSES.includes(query.status)) {
      return json(400, { error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    if ((query.dueBefore && !isValidDate(query.dueBefore)) || (query.dueAfter && !isValidDate(query.dueAfter))) {
      return json(400, { error: "dueBefore and dueAfter must be YYYY-MM-DD" });
    }

    const tasks = await findTasks({
      assigneeId: user.isAdmin ? query.assigneeId : user.id,
      status: query.status,
      dueBefore: query.dueBefore,
      dueAfter: query.dueAfter,
    });

    return json(200, tasks.map(toTask));
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};