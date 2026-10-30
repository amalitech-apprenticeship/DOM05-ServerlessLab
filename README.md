# DOM05-ServerlessLab
Open Source Frontend - https://github.com/CodEZ47/Employee-Task-Assigner

## Phase 1
### Requirements

ADM-01: The system shall allow an Admin to create a task with a title, description, priority, deadline, and optional attachment.
ADM-02: The system shall allow an Admin to assign a task to a Team Member.
ADM-03: The system shall allow an Admin to view all tasks, filterable by status, assignee, and deadline.
ADM-04: The system shall allow an Admin to edit or delete any task.
ADM-05: The system shall allow an Admin to create a new Team Member profile using their name and email, and the system shall email them a temporary password via Cognito.
ADM-06: The system shall allow an Admin to view all members, filterable by name, open tasks, and completed tasks.
ADM-07: The system shall allow an Admin to add comments or attachments to tasks.
ADM-08: The system shall allow an Admin to deactivate a Team Member.

TM-01: The system shall show a Team Member only the tasks assigned to them.
TM-02: The system shall allow a Team Member to change a task’s status (New → To Do → In Progress → Completed | In Progress → Blocked → In Progress ).
TM-03: The system shall prevent a Team Member from creating, deleting, or reassigning tasks.
TM-04: The system shall allow a Team Member to add comments or attachments to their assigned tasks.

NOT-01: When a task is assigned, the system shall notify the assignee by email within 1 minute.
NOT-02: The system shall show users an in-app list of their notifications and let them mark them as read.
NOT-03: When a task’s status changes, the system shall notify the Admin.
NOT-04: The system shall send a reminder to the assignee 24 hours before a task’s deadline.
NOT-05: If a task passes its deadline without being completed, the system shall notify both the assignee and the Admin.

SEC-01: The system shall require all users to log in through Cognito before accessing any page or API.
SEC-02: The system shall enforce roles through Cognito groups (Admin, TeamMember) and check them in every Lambda.
SEC-03: File attachments in S3 shall be private and accessible only through time-limited pre-signed URLs.
SEC-04: The system shall disable self-registration; only Admins can create accounts.

NF-01: API responses shall return in under 2 seconds under normal load.
NF-02: All Lambda errors shall be logged to CloudWatch.

### Features and Services

| Feature | Services |
|---|---|
| Login and roles | Cognito (user pool + Admin/TeamMember groups) |
| Task and member CRUD | API Gateway → Lambda → DynamoDB |
| Attachments | S3 (pre-signed URLs from Lambda) |
| Assignment and status notifications | Lambda → SNS (email) |
| Deadline reminders and overdue alerts | Step Functions (one execution per task, using Wait states) → Lambda → SNS |
| Team Member onboarding | Step Functions (Cognito user + group → Users table → SNS subscription, with rollback on failure) |
| Logging | CloudWatch |

### Data model

**Users**: PK id (the Cognito sub), with name, email, role (admin or member), createdAt, and deactivatedAt.
**Tasks**: PK id, with title, description, category, priority, status, dueDate, assigneeId, attachment (S3 key, name, type, size), createdBy, createdAt, updatedAt, archivedAt, history, and executionArn.
**Comments**: PK taskId, SK createdAt, with id, authorId, body, and attachment.
**Notifications**: PK recipientId, SK createdAt, with id, type (assignment, deadline, update, comment), taskId, title, message, and read.
**Status**: stored on the task as new, to_do, in_progress, blocked, or completed, starting at new.


### API Endpoints


### Tasks

| CRUD | Method | Endpoint | What it does | Who | Req | Success Code |
|---|---|---|---|---|---|---|
| Create | POST | `/tasks` | Create a task (title, description, priority, deadline, optional assignee) | Admin | ADM-01, ADM-02 | 201 Created |
| Read (all) | GET | `/tasks` | List tasks. Admin sees all, filterable by `?status=`, `?assigneeId=`, `?dueBefore=`, `?dueAfter=`. Member sees only their own | Admin, Member | ADM-03, TM-01 | 200 OK |
| Read (one) | GET | `/tasks/{taskId}` | Get one task. Members only if assigned to them | Admin, Member | ADM-03, TM-01 | 200 OK |
| Update | PATCH | `/tasks/{taskId}` | Edit title, description, priority, deadline | Admin | ADM-04 | 200 OK |
| Update | PATCH | `/tasks/{taskId}/assignee` | Assign or reassign a task (triggers the assignment email) | Admin | ADM-02, TM-03 | 200 OK |
| Update | PATCH | `/tasks/{taskId}/status` | Change status, only along allowed transitions | Admin, Member (own tasks) | TM-02 | 200 OK |
| Delete | DELETE | `/tasks/{taskId}` | Delete a task | Admin | ADM-04, TM-03 | 204 No Content |

### Comments

| CRUD | Method | Endpoint | What it does | Who | Req | Success Code |
|---|---|---|---|---|---|---|
| Create | POST | `/tasks/{taskId}/comments` | Add a comment | Admin, Member (own tasks) | ADM-07, TM-04 | 201 Created |
| Read (all) | GET | `/tasks/{taskId}/comments` | List a task's comments | Admin, Member (own tasks) | ADM-07, TM-04 | 200 OK |

### Attachments

| CRUD | Method | Endpoint | What it does | Who | Req | Success Code |
|---|---|---|---|---|---|---|
| Create | POST | `/tasks/{taskId}/attachments` | Save attachment details and return a pre-signed upload URL | Admin, Member (own tasks) | ADM-01, ADM-07, TM-04, SEC-03 | 201 Created |
| Read (all) | GET | `/tasks/{taskId}/attachments` | List a task's attachments (names, sizes, who uploaded) | Admin, Member (own tasks) | SEC-03 | 200 OK |
| Read (one) | GET | `/tasks/{taskId}/attachments/{attachmentId}` | Return a pre-signed download URL | Admin, Member (own tasks) | SEC-03 | 200 OK |
| Delete | DELETE | `/tasks/{taskId}/attachments/{attachmentId}` | Remove an attachment | Admin | ADM-04 | 204 No Content |

### Members

| CRUD | Method | Endpoint | What it does | Who | Req | Success Code |
|---|---|---|---|---|---|---|
| Create | POST | `/members` | Create a member from name + email; Cognito emails a temporary password | Admin | ADM-05, SEC-04 | 201 Created |
| Read (all) | GET | `/members` | List members with open/completed task counts, filterable by `?name=`, `?hasOpenTasks=`, `?hasCompletedTasks=` | Admin | ADM-06 | 200 OK |
| Read (one) | GET | `/members/{memberId}` | Get one member's profile and task counts | Admin | ADM-06 | 200 OK |
| Update | PATCH | `/members/{memberId}` | Deactivate (or reactivate) a member, e.g. `{"active": false}` | Admin | ADM-08 | 200 OK |
| Read (one) | GET | `/me` | Get the logged-in user's own profile and role (the frontend uses this to show the right screens) | Admin, Member | SEC-02 | 200 OK |

### Notifications (in-app)

| CRUD | Method | Endpoint | What it does | Who | Req | Success Code |
|---|---|---|---|---|---|---|
| Read (all) | GET | `/notifications` | List the caller's notifications, filterable by `?unread=true` | Admin, Member | NOT-02 | 200 OK |
| Update | PATCH | `/notifications/{notificationId}` | Mark one as read, e.g. `{"read": true}` | Admin, Member (own) | NOT-02 | 200 OK |
| Update (all) | PATCH | `/notifications` | Mark all of the caller's notifications as read, e.g. `{"read": true}` | Admin, Member (own) | NOT-02 | 200 OK |





