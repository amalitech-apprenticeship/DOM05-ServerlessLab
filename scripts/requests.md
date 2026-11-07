# API test requests

First: `source scripts/get_token.sh` (sets `$TOKEN` and `$API_URL`).
To act as a member: `source scripts/get_token.sh member@example.com 'Password1!'`

## Tasks

### List tasks
```bash
curl -i -H "Authorization: $TOKEN" "$API_URL/tasks"
```

### Create a task (admin)
```bash
curl -i -X POST "$API_URL/tasks" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","dueDate":"2026-12-01","priority":"high"}'
```

### Create a task: expect 400 (missing title)
```bash
curl -i -X POST "$API_URL/tasks" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dueDate":"2026-12-01"}'
```

### No token: expect 401
```bash
curl -i "$API_URL/tasks"
```