import { useEffect, useState } from 'react'

// Current time, refreshed every intervalMs.
export const useNow = (intervalMs = 60000) => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
