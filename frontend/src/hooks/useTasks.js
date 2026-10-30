import { useCallback, useEffect, useRef, useState } from 'react'
import { useApi } from '../api/ApiContext'

export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 15000)

// Tasks visible to the signed-in user. Mutations refetch afterwards; pollMs > 0 also refetches
// on an interval.
export const useTasks = ({ pollMs = 0 } = {}) => {
  const api = useApi()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Responses to superseded requests are ignored, so a slow poll can't undo a mutation.
  const latestRequest = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current
    try {
      const result = await api.tasks.list()
      if (requestId !== latestRequest.current) return
      setTasks(result)
      setError('')
    } catch (err) {
      if (requestId === latestRequest.current) setError(err.message)
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }, [api])

  useEffect(() => {
    refresh()
    if (!pollMs) return undefined
    const timer = setInterval(refresh, pollMs)
    return () => clearInterval(timer)
  }, [refresh, pollMs])

  const mutate = useCallback(
    (fn) => async (...args) => {
      latestRequest.current += 1
      const result = await fn(...args)
      await refresh()
      return result
    },
    [refresh]
  )

  return {
    tasks,
    loading,
    error,
    refresh,
    createTask: mutate(api.tasks.create),
    updateTask: mutate(api.tasks.update),
    assignTask: mutate(api.tasks.assign),
    updateTaskStatus: mutate(api.tasks.updateStatus),
    archiveTask: mutate(api.tasks.archive),
    unarchiveTask: mutate(api.tasks.unarchive),
    addComment: mutate(api.tasks.addComment),
    deleteComment: mutate(api.tasks.deleteComment),
    deleteTask: mutate(api.tasks.remove),
  }
}
