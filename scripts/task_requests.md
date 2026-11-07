# API test requests

Run everything from the `scripts/` folder.

## Setup

```bash
source ./get_token.sh
```

Sets `$TOKEN` (admin) and `$API_URL`. Tokens last about 1 hour; re-run when you get 401s.

### Test member (create once)
```bash
POOL_ID=$(terraform -chdir=../infra/environments/prod output -raw user_pool_id)

aws cognito-idp admin-create-user --region eu-west-1 --user-pool-id $POOL_ID \
  --username member@example.com \
  --user-attributes Name=email,Value=member@example.com Name=email_verified,Value=true Name=name,Value="Test Member" \
  --message-action SUPPRESS > /dev/null

aws cognito-idp admin-set-user-password --region eu-west-1 --user-pool-id $POOL_ID \
  --username member@example.com --password 'Member123!' --permanent

aws cognito-idp admin-add-user-to-group --region eu-west-1 --user-pool-id $POOL_ID \
  --username member@example.com --group-name member
```

### Member ID (needed in every new terminal)
```bash
POOL_ID=$(terraform -chdir=../infra/environments/prod output -raw user_pool_id)
MEMBER_ID=$(aws cognito-idp admin-get-user --region eu-west-1 --user-pool-id $POOL_ID \
  --username member@example.com --query "UserAttributes[?Name=='sub'].Value" --output text)
echo $MEMBER_ID
```

---

## Create a task: `POST /tasks`

### Create (and save its ID)
```bash
TASK_ID=$(curl -s -X POST "$API_URL/tasks" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Test task","dueDate":"2026-12-01","priority":"high"}' | sed -E 's/.*"id":"([^"]+)".*/\1/')
echo $TASK_ID
```
Expect: a UUID.

### Missing title
```bash
curl -i -X POST "$API_URL/tasks" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"dueDate":"2026-12-01"}'
```
Expect: `400`.

### Invalid due date
```bash
curl -i -X POST "$API_URL/tasks" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Bad date","dueDate":"01/12/2026"}'
```
Expect: `400`.

---

## List tasks: `GET /tasks`

### All tasks (admin)
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks"
```
Expect: `200`, every task, sorted by due date.

### No token
```bash
curl -i "$API_URL/tasks"
```
Expect: `401`.

### Filter by status
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks?status=new"
```
Expect: `200`, only `new` tasks.

### Filter by assignee
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks?assigneeId=$MEMBER_ID"
```
Expect: `200`, only the member's tasks.

### Filter by due date range
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks?dueAfter=2026-11-01&dueBefore=2026-12-31"
```
Expect: `200`, only tasks due in that range.

### Combined filters
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks?assigneeId=$MEMBER_ID&status=in_progress&dueBefore=2026-12-31"
```
Expect: `200`.

### Invalid filters
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks?status=done"
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks?dueBefore=tomorrow"
```
Expect: `400` for both.

---

## Get one task: `GET /tasks/{taskId}`

### Existing task
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks/$TASK_ID"
```
Expect: `200`, the task.

### Task that doesn't exist
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks/does-not-exist"
```
Expect: `404`.

---

## Edit a task: `PATCH /tasks/{taskId}`

### Valid edit
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Edited title","priority":"urgent"}'
```
Expect: `200`, new title and priority, an `edited` entry in `history`.

### Invalid priority
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"priority":"super-high"}'
```
Expect: `400`.

### Nothing to update
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{}'
```
Expect: `400`.

### Task that doesn't exist
```bash
curl -i -X PATCH "$API_URL/tasks/does-not-exist" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"x"}'
```
Expect: `404`.

---

## Assign a task: `PATCH /tasks/{taskId}/assignee`

### Assign to the member
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/assignee" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d "{\"assigneeId\":\"$MEMBER_ID\"}"
```
Expect: `200`, `assigneeId` = the member's ID.

### Missing assigneeId
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/assignee" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{}'
```
Expect: `400`.

---

## As the member

### Switch to the member (keeps the admin token)
```bash
ADMIN_TOKEN=$TOKEN
source ./get_token.sh member@example.com 'Member123!'
```

### List: only own tasks
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks"
```
Expect: `200`, only tasks assigned to this member.

### List: assigneeId filter is ignored for members
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks?assigneeId=someone-else"
```
Expect: `200`, still only this member's tasks.

### Get own task
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks/$TASK_ID"
```
Expect: `200`.

### Status: allowed move (new → to_do)
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/status" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"to_do"}'
```
Expect: `200`.

### Status: not allowed (to_do → completed)
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/status" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```
Expect: `409`.

### Status: invalid value
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/status" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```
Expect: `400`.

### Create: not allowed
```bash
curl -i -X POST "$API_URL/tasks" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Member task","dueDate":"2026-12-01"}'
```
Expect: `403`.

### Edit: not allowed
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Member edit"}'
```
Expect: `403`.

### Reassign: not allowed (TM-03)
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/assignee" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"assigneeId":null}'
```
Expect: `403`.

### Delete: not allowed (TM-03)
```bash
curl -i -X DELETE -H "Authorization: $TOKEN" "$API_URL/tasks/$TASK_ID"
```
Expect: `403`.

---

## Back to admin

### Switch back
```bash
TOKEN=$ADMIN_TOKEN
```

### Status: admins may set any status
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/status" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```
Expect: `200`.

### Unassign
```bash
curl -i -X PATCH "$API_URL/tasks/$TASK_ID/assignee" \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"assigneeId":null}'
```
Expect: `200`, `assigneeId: null`; the task no longer appears in the member's list.

---

## Delete a task: `DELETE /tasks/{taskId}`

### Delete
```bash
curl -i -X DELETE -H "Authorization: $TOKEN" "$API_URL/tasks/$TASK_ID"
```
Expect: `204`, no body.

### It's gone
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks/$TASK_ID"
```
Expect: `404`.

### Delete again
```bash
curl -i -X DELETE -H "Authorization: $TOKEN" "$API_URL/tasks/$TASK_ID"
```
Expect: `404`.