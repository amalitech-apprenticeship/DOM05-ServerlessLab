import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { SubscribeCommand } from "@aws-sdk/client-sns";
import {
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getUser } from "../shared/auth.mjs";
import { json, parseBody } from "../shared/http.mjs";
import {
  db,
  cognito,
  USERS_TABLE_NAME,
  USER_POOL_ID,
  EMAIL_PATTERN,
  toUser,
} from "../shared/users.mjs";
import { sns } from "../shared/notify.mjs";

export const handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user.isAdmin) {
      return json(403, { error: "Only admins can create members" });
    }

    const input = parseBody(event);
    if (!input) {
      return json(400, { error: "Body must be a JSON object" });
    }

    const name = String(input.name ?? "").trim();
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    if (!name || name.length > 80) {
      return json(400, { error: "name is required (80 characters max)" });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return json(400, { error: "A valid email address is required" });
    }

    let created;
    try {
      created = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
            { Name: "name", Value: name },
          ],
          DesiredDeliveryMediums: ["EMAIL"],
        }),
      );
    } catch (error) {
      if (error.name === "UsernameExistsException") {
        return json(409, { error: "Another account already uses that email" });
      }
      throw error;
    }

    const username = created.User.Username;
    const id = created.User.Attributes.find(
      (attribute) => attribute.Name === "sub",
    ).Value;

    try {
      await cognito.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          GroupName: "member",
        }),
      );

      const row = {
        id,
        username,
        name,
        email,
        role: "member",
        createdAt: new Date().toISOString(),
      };
      await db.send(
        new PutCommand({
          TableName: USERS_TABLE_NAME,
          Item: row,
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );
      try {
        await sns.send(
          new SubscribeCommand({
            TopicArn: process.env.TOPIC_ARN,
            Protocol: "email",
            Endpoint: email,
            Attributes: { FilterPolicy: JSON.stringify({ recipientId: [id] }) },
          }),
        );
      } catch (error) {
        console.error("SNS subscribe failed", error);
      }

      return json(201, { user: toUser(row), temporaryPassword: null });
    } catch (error) {
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
        }),
      );
      throw error;
    }
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal Server Error" });
  }
};
