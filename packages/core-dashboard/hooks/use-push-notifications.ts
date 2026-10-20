"use client"

import { useEffect, useRef, useCallback } from "react"

interface Appointment {
  id: string
  patientName: string
  time?: string
  status: string
  doctorId?: string
  doctorName?: string
}

interface UsePushNotificationsOptions {
  doctorId?: string
  doctorName?: string
  appointments: Appointment[]
  enabled: boolean
}

export function usePushNotifications({
  doctorId,
  doctorName,
  appointments,
  enabled,
}: UsePushNotificationsOptions) {
  const prevWaitingIds = useRef<Set<string>>(new Set())
  const permissionRequested = useRef(false)

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false
    if (Notification.permission === "granted") return true
    if (Notification.permission === "denied") return false
    const result = await Notification.requestPermission()
    return result === "granted"
  }, [])

  const showNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    new Notification(title, {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: "hypocrates-doctor",
    })
  }, [])

  // Request permission once when the doctor logs in
  useEffect(() => {
    if (!enabled || permissionRequested.current) return
    permissionRequested.current = true
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => {
        requestPermission()
      }, 3000) // Ask after 3 seconds so it's less intrusive
    }
  }, [enabled, requestPermission])

  // Watch for new "ne_pritje" (waiting) appointments
  useEffect(() => {
    if (!enabled || !appointments.length) return

    const myApts = appointments.filter(
      (a) => a.doctorId === doctorId || a.doctorName?.includes(doctorName || '')
    )

    const currentWaiting = myApts.filter((a) => a.status === "ne_pritje")
    const currentIds = new Set(currentWaiting.map((a) => a.id))

    // Find new waiting patients (not in previous set)
    for (const apt of currentWaiting) {
      if (!prevWaitingIds.current.has(apt.id)) {
        showNotification(
          "Pacient Në Pritje — Hypocrates",
          `${apt.patientName} është në pritje${apt.time ? ` (${apt.time})` : ''}`
        )
      }
    }

    prevWaitingIds.current = currentIds
  }, [appointments, doctorId, doctorName, enabled, showNotification])
}
