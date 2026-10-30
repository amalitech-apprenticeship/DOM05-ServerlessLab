import { useCallback, useEffect, useRef, useState } from 'react'
import { useApi } from '../api/ApiContext'
import { POLL_INTERVAL_MS } from './useTasks'

const TOAST_LIMIT = 3

// Polls every pollMs. Unread notifications that appear after the first load become toasts
// and are passed to onNew.
export const useNotifications = ({ pollMs = POLL_INTERVAL_MS, onNew } = {}) => {
  const api = useApi()
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const seenIds = useRef(null)
  // Responses to superseded requests are ignored, so a slow poll can't undo a mark-read.
  const latestRequest = useRef(0)
  const onNewRef = useRef(onNew)
  onNewRef.current = onNew

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current
    const list = await api.notifications.list().catch(() => null)
    if (!list || requestId !== latestRequest.current) return
    if (seenIds.current) {
      const fresh = list.filter((item) => !item.read && !seenIds.current.has(item.id))
      if (fresh.length) {
        setToasts((current) => [...fresh, ...current].slice(0, TOAST_LIMIT))
        onNewRef.current?.(fresh)
      }
    }
    seenIds.current = new Set(list.map((item) => item.id))
    setNotifications(list)
  }, [api])

  useEffect(() => {
    refresh()
    if (!pollMs) return undefined
    const timer = setInterval(refresh, pollMs)
    return () => clearInterval(timer)
  }, [refresh, pollMs])

  const markRead = useCallback(async (id) => {
    latestRequest.current += 1
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
    await api.notifications.markRead(id).catch(() => {})
    await refresh()
  }, [api, refresh])

  const markAllRead = useCallback(async () => {
    latestRequest.current += 1
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    await api.notifications.markAllRead().catch(() => {})
    await refresh()
  }, [api, refresh])

  const dismissToast = useCallback((id) => setToasts((current) => current.filter((item) => item.id !== id)), [])

  return { notifications, toasts, refresh, markRead, markAllRead, dismissToast }
}
