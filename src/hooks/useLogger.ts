/**
 * Простой буфер последних сообщений для UI-панели статуса.
 * Хранит не больше 8 последних строк.
 */

import React from 'react'

interface LogEntry {
  id: string
  timestamp: Date
  message: string
  formattedTime: string
}

export function useLogger() {
  const [logs, setLogs] = React.useState<LogEntry[]>([])

  const addLog = React.useCallback((message: string) => {
    const now = new Date()
    const formattedTime = now.toTimeString().slice(0, 8) // "HH:MM:SS"

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      formattedTime,
      message,
    }

    setLogs((prevLogs) => [entry, ...prevLogs].slice(0, 8))
  }, [])

  const clearLogs = React.useCallback(() => {
    setLogs([])
  }, [])

  return { logs, addLog, clearLogs }
}
