import { ApiError } from '../contract'

// Stub for the backend. Each method must resolve to the shapes in ../contract.js or reject
// with an ApiError carrying an HTTP status (see README: API reference).

const notImplemented = (name) => () =>
  Promise.reject(new ApiError(`http adapter: ${name} is not implemented yet.`, 501))

export const createHttpAdapter = ({ baseUrl } = {}) => {
  void baseUrl

  return {
    auth: {
      login: notImplemented('auth.login'),
      logout: notImplemented('auth.logout'),
      getSession: notImplemented('auth.getSession'),
    },
    users: {
      listMembers: notImplemented('users.listMembers'),
      createMember: notImplemented('users.createMember'),
      updateMember: notImplemented('users.updateMember'),
      deactivateMember: notImplemented('users.deactivateMember'),
      reactivateMember: notImplemented('users.reactivateMember'),
    },
    tasks: {
      list: notImplemented('tasks.list'),
      get: notImplemented('tasks.get'),
      create: notImplemented('tasks.create'),
      update: notImplemented('tasks.update'),
      updateStatus: notImplemented('tasks.updateStatus'),
      assign: notImplemented('tasks.assign'),
      archive: notImplemented('tasks.archive'),
      unarchive: notImplemented('tasks.unarchive'),
      addComment: notImplemented('tasks.addComment'),
      deleteComment: notImplemented('tasks.deleteComment'),
      remove: notImplemented('tasks.remove'),
    },
    notifications: {
      list: notImplemented('notifications.list'),
      markRead: notImplemented('notifications.markRead'),
      markAllRead: notImplemented('notifications.markAllRead'),
    },
  }
}
