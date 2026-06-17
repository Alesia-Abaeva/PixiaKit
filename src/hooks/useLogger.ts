/**
 * Простой буфер последних сообщений для UI-панели статуса.
 * Хранит не больше 8 последних строк.
 */

import React from 'react'

export function useLogger() {
  const [logs, setLogs] = React.useState<string[]>([])

  const addLog = React.useCallback((message: string) => {
    setLogs((prevLogs) => [message, ...prevLogs].slice(0, 8))
  }, [])

  return { logs, addLog }
}
