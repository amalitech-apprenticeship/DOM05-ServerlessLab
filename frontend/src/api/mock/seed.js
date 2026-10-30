import { ROLES, TASK_PRIORITY, TASK_STATUS } from '../contract'
import { addDays, toDateInput } from '../../utils/dates'

// Credentials are added by the mock adapter from VITE_ADMIN_PASSWORD / VITE_DEMO_MEMBER_PASSWORD.
export const SEED_ADMIN_ID = 'u-admin'

export const createSeedUsers = (adminEmail, now) => {
  const createdAt = addDays(now, -30).toISOString()
  const user = (id, name, email, role) => ({ id, name, email, role, createdAt, credential: null })
  return [
    user(SEED_ADMIN_ID, 'Admin', adminEmail, ROLES.ADMIN),
    user('u-1', 'Amit', 'employee1@example.com', ROLES.MEMBER),
    user('u-2', 'Priya', 'employee2@example.com', ROLES.MEMBER),
    user('u-3', 'Ravi', 'employee3@example.com', ROLES.MEMBER),
    user('u-4', 'Neha', 'employee4@example.com', ROLES.MEMBER),
    user('u-5', 'Sanya', 'employee5@example.com', ROLES.MEMBER),
  ]
}

const seedTask = (now, id, title, description, category, dueInDays, assigneeId, status, priority = TASK_PRIORITY.MEDIUM) => {
  const createdAt = addDays(now, -3).toISOString()
  return {
    id,
    title,
    description,
    category,
    dueDate: toDateInput(addDays(now, dueInDays)),
    assigneeId,
    status,
    priority,
    createdBy: 'u-admin',
    createdAt,
    updatedAt: createdAt,
    history: [{ at: createdAt, by: 'u-admin', action: 'created', status, assigneeId }],
  }
}

export const createSeedTasks = (now) => [
  seedTask(now, 't-1', 'Develop new feature', 'Develop a new feature for the application.', 'Development', 1, 'u-1', TASK_STATUS.NEW, TASK_PRIORITY.HIGH),
  seedTask(now, 't-2', 'Testing module 2', 'Test the second module of the application.', 'Testing', -2, 'u-1', TASK_STATUS.COMPLETED),
  seedTask(now, 't-3', 'Research new tech stack', 'Research integrating new technologies into the stack.', 'Research', -1, 'u-1', TASK_STATUS.IN_PROGRESS),
  seedTask(now, 't-4', 'Documentation update', 'Update the documentation for the latest features.', 'Documentation', 4, 'u-2', TASK_STATUS.NEW, TASK_PRIORITY.LOW),
  seedTask(now, 't-5', 'Fix bug in development', 'Fix a critical bug in the development branch.', 'Development', 0, 'u-2', TASK_STATUS.BLOCKED, TASK_PRIORITY.URGENT),
  seedTask(now, 't-6', 'Final research report', 'Complete and submit the research report.', 'Research', 2, 'u-3', TASK_STATUS.COMPLETED),
  seedTask(now, 't-7', 'Design new UI layout', 'Design a new user interface layout for the app.', 'Design', 6, 'u-3', TASK_STATUS.IN_PROGRESS),
  seedTask(now, 't-8', 'Quality assurance testing', 'Run quality assurance testing on the new build.', 'Testing', 3, 'u-4', TASK_STATUS.NEW, TASK_PRIORITY.HIGH),
  seedTask(now, 't-9', 'Design new logo', 'Design a new logo for the company.', 'Design', 9, null, TASK_STATUS.NEW, TASK_PRIORITY.LOW),
]
