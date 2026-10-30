import React, { useMemo, useRef, useState } from 'react'
import AppShell from '../Layout/AppShell'
import Modal from '../Layout/Modal'
import CreateTask from '../others/CreateTask'
import NumberOfTask from '../others/NumberOfTask'
import BoardPage from '../Board/BoardPage'
import MemberActions from '../TaskList/MemberActions'
import TaskDetails from '../TaskDetails/TaskDetails'
import NotificationBell from '../Notifications/NotificationBell'
import Toasts from '../Notifications/Toasts'
import NotificationsPage from '../Notifications/NotificationsPage'
import DeadlineReminder from '../Deadlines/DeadlineReminder'
import DeadlineTracker from '../Deadlines/DeadlineTracker'
import { useAuth } from '../../context/AuthContext'
import { useNow } from '../../hooks/useNow'
import { useDeadlineReminder } from '../../hooks/useDeadlineReminder'
import { POLL_INTERVAL_MS, useTasks } from '../../hooks/useTasks'
import { useNotifications } from '../../hooks/useNotifications'
import { TASK_STATUS } from '../../api/contract'
import { greeting, makeNameOf, matchesSearch } from '../../utils/people'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const now = useNow()
  const { tasks: allTasks, loading, error, refresh, updateTask, updateTaskStatus, addComment, deleteComment } = useTasks({ pollMs: POLL_INTERVAL_MS })
  const tasks = useMemo(() => allTasks.filter((task) => !task.archivedAt), [allTasks])
  const { notifications, toasts, markRead, markAllRead, dismissToast } = useNotifications({ onNew: refresh })
  const [view, setView] = useState('dashboard')
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [pendingTaskId, setPendingTaskId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const reminder = useDeadlineReminder(user.id, tasks, now)
  const trackerRef = useRef(null)

  const nameOf = useMemo(() => makeNameOf([], user), [user])
  const selectedTask = tasks.find((task) => task.id === selectedId) || null
  const open = tasks.filter((task) => task.status !== TASK_STATUS.COMPLETED)
  const categories = useMemo(() => [...new Set(tasks.map((task) => task.category))].sort(), [tasks])

  const saveTask = async (form) => {
    await updateTask(editingTask.id, form)
    setEditingTask(null)
  }

  const changeStatus = async (task, status) => {
    setPendingTaskId(task.id)
    try {
      await updateTaskStatus(task.id, status)
      setActionError('')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPendingTaskId(null)
    }
  }

  const openTask = (task) => {
    setSelectedId(task.id)
    setView('details')
  }

  const onSearch = (value) => {
    setSearch(value)
    if (value && view !== 'board') setView('board')
  }

  const viewDeadlines = () => {
    trackerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    trackerRef.current?.focus({ preventScroll: true })
  }

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'board', label: 'Task board', icon: 'board', badge: open.length },
    { id: 'details', label: 'Task details', icon: 'details' },
  ]

  return (
    <AppShell
      nav={nav}
      active={view}
      onNavigate={setView}
      search={search}
      onSearch={onSearch}
      notifications={<NotificationBell notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} onSeeAll={() => setView('notifications')} />}
    >
      {(error || actionError) && <p className='banner-error' role='alert'>{error || actionError}</p>}
      {loading ? <p className='muted'>Loading tasks…</p> : (
        <>
          {view === 'dashboard' && (
            <>
              <section className='card hero'>
                <div>
                  <p className='eyebrow'><span className='live-dot' /> {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <h1 className='hero-title'>{greeting(now)}, {user.name}. You have {open.length} open {open.length === 1 ? 'task' : 'tasks'}.</h1>
                  <p className='hero-sub'>Accept new work, keep statuses up to date, and flag anything that’s blocking you.</p>
                </div>
                <div className='hero-actions'>
                  <button type='button' className='btn btn-primary' onClick={() => setView('board')}>Open my board</button>
                </div>
              </section>
              {reminder.visible && <DeadlineReminder overdue={reminder.overdue} dueSoon={reminder.dueSoon} onView={viewDeadlines} onSnooze={reminder.snooze} />}
              <NumberOfTask tasks={tasks} />
              <DeadlineTracker ref={trackerRef} tasks={tasks} now={now} onOpen={openTask} />
            </>
          )}
          {view === 'board' && (
            <BoardPage
              tasks={tasks.filter((task) => matchesSearch(task, search, nameOf))}
              now={now}
              nameOf={nameOf}
              onOpen={openTask}
              renderActions={(task) => <MemberActions task={task} onStatusChange={changeStatus} disabled={pendingTaskId === task.id} />}
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
              tasks={tasks}
              now={now}
              nameOf={nameOf}
              pending={pendingTaskId === selectedTask?.id}
              onOpen={openTask}
              onBack={() => setView('board')}
              onStatusChange={changeStatus}
              onAddComment={(task, input) => addComment(task.id, input)}
              onDeleteComment={(task, commentId) => deleteComment(task.id, commentId)}
              onEdit={setEditingTask}
            />
          )}
        </>
      )}
      {editingTask && (
        <Modal title='Edit task' onClose={() => setEditingTask(null)}>
          <CreateTask task={editingTask} categories={categories} canEditAdminFields={false} onSubmit={saveTask} onCancel={() => setEditingTask(null)} />
        </Modal>
      )}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </AppShell>
  )
}

export default EmployeeDashboard
