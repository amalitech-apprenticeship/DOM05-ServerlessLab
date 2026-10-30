import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApi } from '../api/ApiContext'

// members: active (assignable). everyone: also deactivated members.
export const useMembers = () => {
  const api = useApi()
  const [everyone, setEveryone] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setEveryone(await api.users.listMembers())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    refresh()
  }, [refresh])

  const members = useMemo(() => everyone.filter((member) => !member.deactivatedAt), [everyone])

  const createMember = useCallback(async (input) => {
    const result = await api.users.createMember(input)
    await refresh()
    return result
  }, [api, refresh])

  const updateMember = useCallback(async (id, patch) => {
    const updated = await api.users.updateMember(id, patch)
    await refresh()
    return updated
  }, [api, refresh])

  const deactivateMember = useCallback(async (id) => {
    const result = await api.users.deactivateMember(id)
    await refresh()
    return result
  }, [api, refresh])

  const reactivateMember = useCallback(async (id) => {
    const result = await api.users.reactivateMember(id)
    await refresh()
    return result
  }, [api, refresh])

  return { members, everyone, loading, error, refresh, createMember, updateMember, deactivateMember, reactivateMember }
}
