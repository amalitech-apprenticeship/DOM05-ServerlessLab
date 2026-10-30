import React, { useCallback, useMemo, useState } from 'react'
import AppShell from '../Layout/AppShell'
import Icon from '../Layout/Icon'
import Modal from '../Layout/Modal'
import CreateTask from '../others/CreateTask'
import AllTask from '../others/AllTask'
import AdminOverview from '../Admin/AdminOverview'
import BoardPage from '../Board/BoardPage'
import TaskDetails from '../TaskDetails/TaskDetails'
import TeamMembers from '../Admin/TeamMembers'
import NotificationBell from '../Notifications/NotificationBell'
import Toasts from '../Notifications/Toasts'
import NotificationsPage from '../Notifications/NotificationsPage'
import { useAuth } from '../../context/AuthContext'
import { POLL_INTERVAL_MS, useTasks } from '../../hooks/useTasks'
import { useMembers } from '../../hooks/useMembers'
import { useNotifications } from '../../hooks/useNotifications'
import { useNow } from '../../hooks/useNow'
import { TASK_STATUS } from '../../api/contract'
import { makeNameOf, matchesSearch } from '../../utils/people'

const AdminDashboard = () => {
  const { user } = useAuth()
  const now = useNow()
  const { tasks, loading, error, refresh, createTask, updateTask, assignTask, updateTaskStatus, archiveTask, unarchiveTask, deleteTask, addComment, deleteComment } = useTasks({ pollMs: POLL_INTERVAL_MS })
  const { members, everyone, loading: membersLoading, error: membersError, createMember, updateMember, deactivateMember, reactivateMember } = useMembers()
  const { notifications, toasts, markRead, markAllRead, dismissToast } = useNotifications({ onNew: refresh })
  const [view, setView] = useState('dashboard')
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal] = useState(null) // null | { task } (task is null when creating)
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState('')
  const [pending, setPending] = useState(false)
  const [archiveNotice, setArchiveNotice] = useState(null) // the task just archived, for "Undo"

  const nameOf = useMemo(() => makeNameOf(everyone, user), [everyone, user])
  const categories = useMemo(() => [...new Set(tasks.map((task) => task.category))].sort(), [tasks])
  const selectedTask = tasks.find((task) => task.id === selectedId) || null
  const activeTasks = useMemo(() => tasks.filter((task) => !task.archivedAt), [tasks])
  const archivedTasks = useMemo(
    () => tasks.filter((task) => task.archivedAt).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
    [tasks]
  )
  const searched = activeTasks.filter((task) => matchesSearch(task, search, nameOf))
  const searchedArchive = archivedTasks.filter((task) => matchesSearch(task, search, nameOf))

  const openTask = useCallback((task) => {
    setSelectedId(task.id)
    setView('details')
  }, [])

  const onSearch = (value) => {
    setSearch(value)
    if (value && view !== 'board') setView('board')
  }

  const runAction = (fn) => async (...args) => {
    setPending(true)
    try {
      await fn(...args)
      setActionError('')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPending(false)
    }
  }

  const saveTask = async (form) => {
    if (modal?.task) await updateTask(modal.task.id, form)
    else await createTask(form)
    setModal(null)
  }

  const removeTask = runAction(async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    await deleteTask(task.id)
    if (selectedId === task.id) {
      setSelectedId(null)
      setView('board')
    }
  })

  const reassignTask = runAction((task, assigneeId) => assignTask(task.id, assigneeId))
  const changeStatus = runAction((task, status) => updateTaskStatus(task.id, status))

  const archive = runAction(async (task) => {
    await archiveTask(task.id)
    setArchiveNotice(task)
  })

  const restore = runAction(async (task) => {
    await unarchiveTask(task.id)
    setArchiveNotice(null)
  })

  // Deactivation also unassigns tasks, so tasks are refetched too.
  const deactivateTeamMember = async (id) => {
    const result = await deactivateMember(id)
    await refresh()
    return result
  }

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'board', label: 'Task board', icon: 'board', badge: activeTasks.filter((task) => task.status !== TASK_STATUS.COMPLETED).length },
    { id: 'details', label: 'Task details', icon: 'details' },
    { id: 'team', label: 'Team members', icon: 'users', badge: members.length },
  ]

  return (
    <AppShell
      nav={nav}
      active={view}
      onNavigate={setView}
      search={search}
      onSearch={onSearch}
      actions={<button type='button' className='btn btn-primary' onClick={() => setModal({ task: null })}><Icon name='plus' size={16} /> New task</button>}
      notifications={<NotificationBell notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} onSeeAll={() => setView('notifications')} />}
    >
      {(error || actionError) && <p className='banner-error' role='alert'>{error || actionError}</p>}
      {archiveNotice && view !== 'team' && (
        <div className='banner-info notice-row' role='status'>
          <span><Icon name='archive' size={16} /> “{archiveNotice.title}” was archived.</span>
          <span>
            <button type='button' className='link-button' onClick={() => restore(archiveNotice)}>Undo</button>
            <button type='button' className='icon-button' aria-label='Dismiss' onClick={() => setArchiveNotice(null)}><Icon name='close' size={16} /></button>
          </span>
        </div>
      )}
      {view === 'team' && (
        <TeamMembers members={everyone} tasks={tasks} loading={membersLoading} error={membersError} onCreate={createMember} onUpdate={updateMember} onDeactivate={deactivateTeamMember} onReactivate={reactivateMember} />
      )}
      {view !== 'team' && (loading ? <p className='muted'>Loading tasks…</p> : (
        <>
          {view === 'dashboard' && (
            <AdminOverview tasks={activeTasks} members={members} nameOf={nameOf} now={now} onOpen={openTask} onViewBoard={() => setView('board')} onNewTask={() => setModal({ task: null })} />
          )}
          {view === 'board' && (
            <BoardPage
              tasks={searched}
              archived={searchedArchive}
              now={now}
              nameOf={nameOf}
              members={members}
              isAdmin
              onOpen={openTask}
              onAdd={() => setModal({ task: null })}
              renderActions={(task) => task.status === TASK_STATUS.COMPLETED && (
                <button type='button' className='btn btn-sm btn-ghost' onClick={() => archive(task)} disabled={pending} aria-label={`Archive ${task.title}`}>
                  <Icon name='archive' size={14} /> Archive
                </button>
              )}
              renderArchivedActions={(task) => (
                <button type='button' className='btn btn-sm btn-ghost' onClick={() => restore(task)} disabled={pending} aria-label={`Restore ${task.title}`}>
                  <Icon name='restore' size={14} /> Restore
                </button>
              )}
              renderList={(visible) => <AllTask tasks={visible} members={members} onOpen={openTask} onEdit={(task) => setModal({ task })} onDelete={removeTask} onAssign={reassignTask} onArchive={archive} />}
            />
          )}
          {view === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              now={now}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              canOpenTask={(id) => tasks.some((task) => task.id === id)}
              onOpenTask={(id) => openTask({ id })}
              onBack={() => setView('dashboard')}
            />
          )}
          {view === 'details' && (
            <TaskDetails
              task={selectedTask}
              tasks={activeTasks}
              now={now}
              nameOf={nameOf}
              members={members}
              isAdmin
              pending={pending}
              onOpen={openTask}
              onBack={() => setView('board')}
              onStatusChange={changeStatus}
              onAddComment={(task, input) => addComment(task.id, input)}
              onDeleteComment={(task, commentId) => deleteComment(task.id, commentId)}
              onAssign={reassignTask}
              onEdit={(task) => setModal({ task })}
              onDelete={removeTask}
              onArchive={archive}
              onUnarchive={restore}
            />
          )}
        </>
      ))}

      {modal && (
        <Modal title={modal.task ? 'Edit task' : 'New task'} onClose={() => setModal(null)}>
          <CreateTask task={modal.task} members={members} categories={categories} onSubmit={saveTask} onCancel={() => setModal(null)} />
        </Modal>
      )}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </AppShell>
  )
}

export default AdminDashboard
