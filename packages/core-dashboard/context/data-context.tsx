"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, Dispatch, SetStateAction } from 'react'
import {
  Patient, Appointment, Treatment, Invoice, Staff,
  AuditLog, AppNotification, DailyTransaction, Payment,
  Prescription, PatientDocument, Service, PatientService,
  NotificationLog, Room,
} from '@core/types'
import * as patientsApi         from '@core/lib/api/patients'
import * as appointmentsApi     from '@core/lib/api/appointments'
import * as treatmentsApi       from '@core/lib/api/treatments'
import * as invoicesApi         from '@core/lib/api/invoices'
import * as staffApi            from '@core/lib/api/staff'
import * as auditApi            from '@core/lib/api/audit'
import * as transactionsApi     from '@core/lib/api/transactions'
import * as prescriptionsApi    from '@core/lib/api/prescriptions'
import * as documentsApi        from '@core/lib/api/documents'
import * as servicesApi         from '@core/lib/api/services'
import * as roomsApi            from '@core/lib/api/rooms'
import * as patientServicesApi  from '@core/lib/api/patient-services'
import * as adminNotifsApi      from '@core/lib/api/admin-notifications'
import * as settingsApi         from '@core/lib/api/settings'
import * as notificationsApi    from '@core/lib/api/notifications'
import { setExchangeRate }      from '@core/lib/currency'
import { getSocket } from '@core/lib/realtime'
import { useAuth } from './auth-context'

interface DataContextType {
  // Loading / connection state
  isDataLoading: boolean
  backendOffline: boolean

  // Patients
  patients: Patient[]
  addPatient:    (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient>
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>
  deletePatient: (id: string) => Promise<void>
  getPatient:    (id: string) => Patient | undefined
  refreshPatients: () => Promise<void>

  // Appointments
  appointments: Appointment[]
  addAppointment:    (appointment: Omit<Appointment, 'id'>) => Promise<void>
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<void>
  deleteAppointment: (id: string) => Promise<void>
  getAppointmentsByDate:   (date: string) => Appointment[]
  getAppointmentsByDoctor: (doctorId: string) => Appointment[]
  refreshAppointments: () => Promise<void>

  // Treatments
  treatments: Treatment[]
  addTreatment:    (treatment: Omit<Treatment, 'id'>) => Promise<void>
  updateTreatment: (id: string, treatment: Partial<Treatment>) => Promise<void>
  deleteTreatment: (id: string) => Promise<void>
  getTreatmentsByPatient: (patientId: string) => Treatment[]
  refreshTreatments: () => Promise<void>

  // Invoices
  invoices: Invoice[]
  addInvoice:    (invoice: Omit<Invoice, 'id' | 'payments'>) => Promise<Invoice>
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  addPayment:    (invoiceId: string, payment: Omit<Payment, 'id' | 'invoiceId'>) => Promise<void>
  refreshInvoices: () => Promise<void>

  // Staff
  staff: Staff[]
  addStaff:    (staffMember: Omit<Staff, 'id' | 'joinedAt'> & { password: string }) => Promise<void>
  updateStaff: (id: string, staffMember: Partial<Staff>) => Promise<void>
  deleteStaff: (id: string) => Promise<void>
  refreshStaff: () => Promise<void>

  // Audit Logs
  auditLogs: AuditLog[]
  addAuditLog: (action: string, details: string) => Promise<void>
  refreshAuditLogs: () => Promise<void>

  // In-app notifications
  appNotifications: AppNotification[]
  unreadCount: number
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  // Daily Transactions
  dailyTransactions: DailyTransaction[]
  addTransaction: (transaction: Omit<DailyTransaction, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>
  refreshTransactions: () => Promise<void>

  // Prescriptions
  prescriptions: Prescription[]
  addPrescription: (prescription: Omit<Prescription, 'id'>) => Promise<void>
  refreshPrescriptions: () => Promise<void>

  // Documents
  documents: PatientDocument[]
  addDocument: (patientId: string, file: File, category?: PatientDocument['category']) => Promise<void>
  addDocumentsBatch: (patientId: string, files: File[], imageSubtype: string) => Promise<{ studyId: string; documents: PatientDocument[]; failed: { filename: string; error: string }[] }>
  deleteDocument: (id: string) => Promise<void>
  getDocumentsByPatient: (patientId: string) => PatientDocument[]
  refreshDocuments: (patientId: string) => Promise<void>

  // Services
  services: Service[]
  addService:    (service: Omit<Service, 'id'>) => Promise<void>
  updateService: (id: string, service: Partial<Service>) => Promise<void>
  deleteService: (id: string) => Promise<void>
  refreshServices: () => Promise<void>

  // Rooms/chairs (optional scheduling resource)
  rooms: Room[]
  addRoom:    (room: Omit<Room, 'id' | 'createdAt'>) => Promise<void>
  updateRoom: (id: string, room: Partial<Room>) => Promise<void>
  deleteRoom: (id: string) => Promise<void>
  refreshRooms: () => Promise<void>

  // Patient Services
  patientServices: PatientService[]
  addPatientService:    (ps: Omit<PatientService, 'id'>) => Promise<PatientService>
  deletePatientService: (id: string) => Promise<void>
  markPatientServiceInvoiced: (id: string, invoiceId?: string) => Promise<void>
  getPatientServicesByPatient: (patientId: string) => PatientService[]
  refreshPatientServices: () => Promise<void>

  // Notifications (SMS / Email / WhatsApp outbox)
  notificationLogs: NotificationLog[]
  sendPatientNotification: (data: { type: NotificationLog['type']; recipient: string; message: string }) => Promise<NotificationLog>
  refreshNotificationLogs: () => Promise<void>

  // Stats (computed from in-memory state)
  getStats: () => {
    totalPatients: number
    totalAppointmentsToday: number
    totalRevenue: number
    pendingPayments: number
  }
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()

  const [isDataLoading,     setIsDataLoading]     = useState(true)
  const [backendOffline,    setBackendOffline]    = useState(false)
  const [patients,          setPatients]          = useState<Patient[]>([])
  const [appointments,      setAppointments]      = useState<Appointment[]>([])
  const [treatments,        setTreatments]        = useState<Treatment[]>([])
  const [invoices,          setInvoices]          = useState<Invoice[]>([])
  const [staff,             setStaff]             = useState<Staff[]>([])
  const [auditLogs,         setAuditLogs]         = useState<AuditLog[]>([])
  const [dailyTransactions, setDailyTransactions] = useState<DailyTransaction[]>([])
  const [prescriptions,     setPrescriptions]     = useState<Prescription[]>([])
  const [documents,         setDocuments]         = useState<PatientDocument[]>([])
  const [services,          setServices]          = useState<Service[]>([])
  const [rooms,             setRooms]             = useState<Room[]>([])
  const [patientServices,   setPatientServices]   = useState<PatientService[]>([])
  const [appNotifications,  setAppNotifications]  = useState<AppNotification[]>([])
  const [notificationLogs,  setNotificationLogs]  = useState<NotificationLog[]>([])

  // Real-time push (Socket.IO) keeps appointments/patients/staff/admin-notifications
  // in sync instantly. The intervals below are now just a long-interval safety net
  // in case a socket silently drops — not the primary sync mechanism anymore.
  useEffect(() => {
    if (!isAuthenticated) return
    const id = setInterval(async () => {
      try {
        const [appts, pats, stf] = await Promise.all([
          appointmentsApi.getAppointments(),
          patientsApi.getPatients(),
          staffApi.getStaff(),
        ])
        setAppointments(appts)
        setPatients(pats)
        setStaff(stf)
      } catch {}
    }, 300_000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  // Admin: fetch DB-backed notifications; long-interval fallback alongside the socket push below
  useEffect(() => {
    if (user?.role !== 'admin') return
    let cancelled = false

    const fetch = async () => {
      try {
        const notifs = await adminNotifsApi.getAdminNotifications()
        if (!cancelled) setAppNotifications(notifs)
      } catch {}
    }

    fetch()
    const interval = setInterval(fetch, 300_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [user?.role, user?.id])

  // Socket.IO: apply server-pushed mutations directly to local state. Handlers
  // upsert-by-id on "created" so a duplicate push (e.g. the same client's own
  // mutation echoed back) never produces a duplicate row.
  useEffect(() => {
    if (!isAuthenticated) return
    const socket = getSocket()
    if (!socket) return

    const upsert = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>) =>
      (item: T) => setter(prev => prev.some(x => x.id === item.id) ? prev.map(x => x.id === item.id ? item : x) : [...prev, item])
    const patch = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>) =>
      (item: T) => setter(prev => prev.map(x => x.id === item.id ? item : x))
    const drop = <T extends { id: string }>(setter: Dispatch<SetStateAction<T[]>>) =>
      (payload: { id: string }) => setter(prev => prev.filter(x => x.id !== payload.id))

    const onApptCreated = upsert(setAppointments)
    const onApptUpdated = patch(setAppointments)
    const onApptDeleted = drop(setAppointments)
    const onPatientCreated = upsert(setPatients)
    const onPatientUpdated = patch(setPatients)
    const onPatientDeleted = drop(setPatients)
    const onStaffCreated = upsert(setStaff)
    const onStaffUpdated = patch(setStaff)
    const onStaffDeleted = drop(setStaff)
    const onAdminNotification = (n: AppNotification) =>
      setAppNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev])

    socket.on('appointment:created', onApptCreated)
    socket.on('appointment:updated', onApptUpdated)
    socket.on('appointment:deleted', onApptDeleted)
    socket.on('patient:created', onPatientCreated)
    socket.on('patient:updated', onPatientUpdated)
    socket.on('patient:deleted', onPatientDeleted)
    socket.on('staff:created', onStaffCreated)
    socket.on('staff:updated', onStaffUpdated)
    socket.on('staff:deleted', onStaffDeleted)
    socket.on('admin-notification:new', onAdminNotification)

    return () => {
      socket.off('appointment:created', onApptCreated)
      socket.off('appointment:updated', onApptUpdated)
      socket.off('appointment:deleted', onApptDeleted)
      socket.off('patient:created', onPatientCreated)
      socket.off('patient:updated', onPatientUpdated)
      socket.off('patient:deleted', onPatientDeleted)
      socket.off('staff:created', onStaffCreated)
      socket.off('staff:updated', onStaffUpdated)
      socket.off('staff:deleted', onStaffDeleted)
      socket.off('admin-notification:new', onAdminNotification)
    }
  }, [isAuthenticated])

  const pushNotif = useCallback((_n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    // Notifications are admin-only via DB polling. No local push for other roles.
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setAppNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    setAppNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    if (user?.role === 'admin') {
      try { await adminNotifsApi.markAllSeen() } catch {}
    }
  }, [user?.role])

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    const loadAll = async () => {
      setIsDataLoading(true)
      try {
        // Each request has its own fallback so a single slow/failing endpoint
        // doesn't block the rest of the page from loading.
        let networkDown = false
        const safe = <T,>(p: Promise<T>, fallback: T, detectNet = false): Promise<T> =>
          p.catch(e => {
            if (detectNet && e instanceof TypeError && (e as TypeError).message.toLowerCase().includes('fetch')) {
              networkDown = true
            }
            return fallback
          })

        const [pats, appts, treats, invs, stf, txns, rxs] = await Promise.all([
          safe(patientsApi.getPatients(),            [] as Patient[],          true),
          safe(appointmentsApi.getAppointments(),    [] as Appointment[]),
          safe(treatmentsApi.getTreatments(),        [] as Treatment[]),
          safe(invoicesApi.getInvoices(),            [] as Invoice[]),
          safe(staffApi.getStaff(),                  [] as Staff[]),
          safe(transactionsApi.getTransactions(),    [] as DailyTransaction[]),
          safe(prescriptionsApi.getPrescriptions(),  [] as Prescription[]),
        ])

        if (networkDown) {
          setBackendOffline(true)
          return
        }

        setPatients(pats)
        setAppointments(appts)
        setTreatments(treats)
        setInvoices(invs)
        setStaff(stf)
        setDailyTransactions(txns)
        setPrescriptions(rxs)

        // Fetch live EUR→LEK exchange rate (silently falls back to 103 on error)
        settingsApi.getExchangeRate()
          .then(({ eur_to_lek }) => setExchangeRate(eur_to_lek))
          .catch(() => {})

        // Load services, rooms, and patient-services separately with fallbacks
        // so a missing DB table doesn't crash the entire data load
        const [svcs, rms, psvcs] = await Promise.all([
          servicesApi.getServices().catch(() => [] as Service[]),
          roomsApi.getRooms().catch(() => [] as Room[]),
          patientServicesApi.getPatientServices().catch(() => [] as PatientService[]),
        ])
        setServices(svcs)
        setRooms(rms)
        setPatientServices(psvcs)

        // Admin: load audit logs
        if (user?.role === 'admin') {
          const logs = await auditApi.getAuditLogs({ limit: 100 }).catch(() => [] as AuditLog[])
          setAuditLogs(logs)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsDataLoading(false)
      }
    }
    loadAll()
  }, [isAuthenticated, user?.role])

  // ── Refresh helpers ────────────────────────────────────────────────────────
  const refreshPatients     = useCallback(async () => { setPatients(await patientsApi.getPatients()) }, [])
  const refreshAppointments = useCallback(async () => { setAppointments(await appointmentsApi.getAppointments()) }, [])
  const refreshTreatments   = useCallback(async () => { setTreatments(await treatmentsApi.getTreatments()) }, [])
  const refreshInvoices     = useCallback(async () => { setInvoices(await invoicesApi.getInvoices()) }, [])
  const refreshStaff        = useCallback(async () => { setStaff(await staffApi.getStaff()) }, [])
  const refreshAuditLogs    = useCallback(async () => { setAuditLogs(await auditApi.getAuditLogs({ limit: 100 })) }, [])
  const refreshTransactions  = useCallback(async () => { setDailyTransactions(await transactionsApi.getTransactions()) }, [])
  const refreshPrescriptions = useCallback(async () => { setPrescriptions(await prescriptionsApi.getPrescriptions()) }, [])
  const refreshServices       = useCallback(async () => { setServices(await servicesApi.getServices()) }, [])
  const refreshRooms          = useCallback(async () => { setRooms(await roomsApi.getRooms()) }, [])
  const refreshPatientServices = useCallback(async () => { setPatientServices(await patientServicesApi.getPatientServices()) }, [])

  const refreshDocuments     = useCallback(async (patientId: string) => {
    const docs = await documentsApi.getDocumentsByPatient(patientId)
    setDocuments((prev: PatientDocument[]) => {
      const others = prev.filter((d: PatientDocument) => d.patientId !== patientId)
      return [...others, ...docs]
    })
  }, [])

  // ── Audit log helper ───────────────────────────────────────────────────────
  const addAuditLog = useCallback(async (action: string, details: string) => {
    // Audit logs are auto-created server-side; just refresh the list
    try {
      if (user?.role === 'admin') {
        const logs = await auditApi.getAuditLogs({ limit: 100 })
        setAuditLogs(logs)
      }
    } catch {}
  }, [user?.role])

  // ── Patients ───────────────────────────────────────────────────────────────
  const addPatient = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> => {
    const created = await patientsApi.createPatient(patient)
    setPatients((prev: Patient[]) => [created, ...prev])
    pushNotif({
      type: 'pacient',
      title: 'Pacient i ri u regjistrua',
      message: `${patient.firstName} ${patient.lastName} u shtua në sistem`,
      href: `/doktor/pacientet/${created.id}`,
    })
    return created
  }, [pushNotif])

  const updatePatient = useCallback(async (id: string, patient: Partial<Patient>) => {
    const updated = await patientsApi.updatePatient(id, patient)
    setPatients((prev: Patient[]) => prev.map((p: Patient) => p.id === id ? updated : p))
  }, [])

  const deletePatient = useCallback(async (id: string) => {
    await patientsApi.deletePatient(id)
    setPatients((prev: Patient[]) => prev.filter((p: Patient) => p.id !== id))
  }, [])

  const getPatient = useCallback((id: string) => {
    return patients.find(p => p.id === id)
  }, [patients])

  // ── Appointments ───────────────────────────────────────────────────────────
  const addAppointment = useCallback(async (appointment: Omit<Appointment, 'id'>) => {
    const created = await appointmentsApi.createAppointment(appointment)
    setAppointments((prev: Appointment[]) => [...prev, created])
    pushNotif({
      type: 'takim',
      title: 'Takim i ri u shtua',
      message: `${appointment.patientName} · ${appointment.date?.substring(0, 10)} ${appointment.time || ''}`.trim(),
      href: '/doktor/takimet',
    })
  }, [pushNotif])

  const updateAppointment = useCallback(async (id: string, appointment: Partial<Appointment>) => {
    const updated = await appointmentsApi.updateAppointment(id, appointment)
    setAppointments((prev: Appointment[]) => {
      if (appointment.status) {
        const existing = prev.find((a) => a.id === id)
        const name = existing?.patientName || updated.patientName || ''
        const msgMap: Partial<Record<string, string>> = {
          ne_trajtim:  `Takimi filloi për ${name}`,
          perfunduar:  `Takimi u përfundua për ${name}`,
          anuluar:     `Takimi u anulua për ${name}`,
        }
        const msg = msgMap[appointment.status]
        if (msg) pushNotif({ type: 'takim', title: 'Përditësim takimi', message: msg, href: '/doktor/takimet' })
      }
      return prev.map((a: Appointment) => a.id === id ? updated : a)
    })
  }, [pushNotif])

  const deleteAppointment = useCallback(async (id: string) => {
    await appointmentsApi.deleteAppointment(id)
    setAppointments((prev: Appointment[]) => prev.filter((a: Appointment) => a.id !== id))
  }, [])

  const getAppointmentsByDate = useCallback((date: string) => {
    return appointments.filter(a => a.date === date)
  }, [appointments])

  const getAppointmentsByDoctor = useCallback((doctorId: string) => {
    return appointments.filter(a => a.doctorId === doctorId)
  }, [appointments])

  // ── Treatments ─────────────────────────────────────────────────────────────
  const addTreatment = useCallback(async (treatment: Omit<Treatment, 'id'>) => {
    const created = await treatmentsApi.createTreatment(treatment)
    setTreatments((prev: Treatment[]) => [created, ...prev])
    pushNotif({
      type: 'trajtim',
      title: 'Trajtim i ri u regjistrua',
      message: `${treatment.type || 'Trajtim'} për ${treatment.patientName || ''}`.trim(),
      href: '/doktor/trajtimet',
    })
  }, [pushNotif])

  const updateTreatment = useCallback(async (id: string, treatment: Partial<Treatment>) => {
    const updated = await treatmentsApi.updateTreatment(id, treatment)
    setTreatments((prev: Treatment[]) => prev.map((t: Treatment) => t.id === id ? updated : t))
  }, [])

  const deleteTreatment = useCallback(async (id: string) => {
    await treatmentsApi.deleteTreatment(id)
    setTreatments((prev: Treatment[]) => prev.filter((t: Treatment) => t.id !== id))
  }, [])

  const getTreatmentsByPatient = useCallback((patientId: string) => {
    return treatments.filter(t => t.patientId === patientId)
  }, [treatments])

  // ── Invoices ───────────────────────────────────────────────────────────────
  const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id' | 'payments'>) => {
    const created = await invoicesApi.createInvoice(invoice)
    setInvoices((prev: Invoice[]) => [created, ...prev])
    // Returned (not void) so callers can link the real generated invoice ID
    // back to whatever patient_services it was billed from — see
    // recepsion/faturat/page.tsx's handleGenerateInvoice, the only current
    // invoice-creation flow, and why that link matters at all: commission
    // calculation's payment-based mode needs to know which invoice a given
    // billed service ended up on.
    return created
  }, [])

  const updateInvoice = useCallback(async (id: string, invoice: Partial<Invoice>) => {
    const updated = await invoicesApi.updateInvoice(id, invoice)
    setInvoices((prev: Invoice[]) => prev.map((i: Invoice) => i.id === id ? updated : i))
  }, [])

  const deleteInvoice = useCallback(async (id: string) => {
    await invoicesApi.deleteInvoice(id)
    setInvoices((prev: Invoice[]) => prev.filter((i: Invoice) => i.id !== id))
  }, [])

  const addPayment = useCallback(async (invoiceId: string, payment: Omit<Payment, 'id' | 'invoiceId'>) => {
    const updatedInvoice = await invoicesApi.addPayment(invoiceId, payment)
    setInvoices((prev: Invoice[]) => prev.map((i: Invoice) => i.id === invoiceId ? updatedInvoice : i))
    // Refresh transactions since addPayment auto-creates one server-side
    const txns = await transactionsApi.getTransactions()
    setDailyTransactions(txns)
  }, [])

  // ── Staff ──────────────────────────────────────────────────────────────────
  const addStaff = useCallback(async (staffMember: Omit<Staff, 'id' | 'joinedAt'> & { password: string }) => {
    const created = await staffApi.createStaff(staffMember)
    setStaff((prev: Staff[]) => [...prev, created])
  }, [])

  const updateStaff = useCallback(async (id: string, staffMember: Partial<Staff>) => {
    const updated = await staffApi.updateStaff(id, staffMember)
    setStaff((prev: Staff[]) => prev.map((s: Staff) => s.id === id ? updated : s))
  }, [])

  const deleteStaff = useCallback(async (id: string) => {
    await staffApi.deleteStaff(id)
    setStaff((prev: Staff[]) => prev.filter((s: Staff) => s.id !== id))
  }, [])

  // ── Daily Transactions ─────────────────────────────────────────────────────
  const addTransaction = useCallback(async (transaction: Omit<DailyTransaction, 'id' | 'createdAt' | 'createdBy'>) => {
    const created = await transactionsApi.createTransaction(transaction)
    setDailyTransactions((prev: DailyTransaction[]) => [created, ...prev])
  }, [])

  // ── Prescriptions ──────────────────────────────────────────────────────────
  const addPrescription = useCallback(async (prescription: Omit<Prescription, 'id'>) => {
    const created = await prescriptionsApi.createPrescription(prescription)
    setPrescriptions((prev: Prescription[]) => [created, ...prev])
    pushNotif({
      type: 'recetë',
      title: 'Recetë e re u krijua',
      message: `${prescription.medication} për ${prescription.patientName || ''}`.trim(),
      href: '/doktor/recetat',
    })
  }, [pushNotif])

  // ── Documents ──────────────────────────────────────────────────────────────
  const addDocument = useCallback(async (patientId: string, file: File, category?: PatientDocument['category']) => {
    const created = await documentsApi.uploadDocument(patientId, file, category)
    setDocuments((prev: PatientDocument[]) => [created, ...prev])
  }, [])

  const addDocumentsBatch = useCallback(async (patientId: string, files: File[], imageSubtype: string) => {
    const result = await documentsApi.uploadDocumentsBatch(patientId, files, imageSubtype)
    setDocuments((prev: PatientDocument[]) => [...result.documents, ...prev])
    return result
  }, [])

  const deleteDocument = useCallback(async (id: string) => {
    await documentsApi.deleteDocument(id)
    setDocuments((prev: PatientDocument[]) => prev.filter((d: PatientDocument) => d.id !== id))
  }, [])

  const getDocumentsByPatient = useCallback((patientId: string) => {
    return documents.filter(d => d.patientId === patientId)
  }, [documents])

  // ── Services ───────────────────────────────────────────────────────────────
  const addService = useCallback(async (service: Omit<Service, 'id'>) => {
    const created = await servicesApi.createService(service)
    setServices((prev: Service[]) => [...prev, created])
  }, [])

  const updateService = useCallback(async (id: string, service: Partial<Service>) => {
    const updated = await servicesApi.updateService(id, service)
    setServices((prev: Service[]) => prev.map((s: Service) => s.id === id ? updated : s))
  }, [])

  const deleteService = useCallback(async (id: string) => {
    await servicesApi.deleteService(id)
    setServices((prev: Service[]) => prev.filter((s: Service) => s.id !== id))
  }, [])

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const addRoom = useCallback(async (room: Omit<Room, 'id' | 'createdAt'>) => {
    const created = await roomsApi.createRoom(room)
    setRooms((prev: Room[]) => [...prev, created])
  }, [])

  const updateRoom = useCallback(async (id: string, room: Partial<Room>) => {
    const updated = await roomsApi.updateRoom(id, room)
    setRooms((prev: Room[]) => prev.map((r: Room) => r.id === id ? updated : r))
  }, [])

  const deleteRoom = useCallback(async (id: string) => {
    await roomsApi.deleteRoom(id)
    setRooms((prev: Room[]) => prev.filter((r: Room) => r.id !== id))
  }, [])

  // ── Patient Services ───────────────────────────────────────────────────────
  const addPatientService = useCallback(async (ps: Omit<PatientService, 'id'>) => {
    const created = await patientServicesApi.createPatientService(ps)
    setPatientServices((prev: PatientService[]) => [created, ...prev])
    return created
  }, [])

  const deletePatientService = useCallback(async (id: string) => {
    await patientServicesApi.deletePatientService(id)
    setPatientServices((prev: PatientService[]) => prev.filter((ps: PatientService) => ps.id !== id))
  }, [])

  const markPatientServiceInvoiced = useCallback(async (id: string, invoiceId?: string) => {
    await patientServicesApi.markPatientServiceInvoiced(id, invoiceId)
    setPatientServices((prev: PatientService[]) =>
      prev.map((ps: PatientService) => ps.id === id ? { ...ps, invoiced: true, invoiceId: invoiceId ?? ps.invoiceId } : ps)
    )
  }, [])

  const getPatientServicesByPatient = useCallback((patientId: string) => {
    return patientServices.filter(ps => ps.patientId === patientId)
  }, [patientServices])

  // ── Notifications (SMS/Email/WhatsApp outbox) ─────────────────────────────
  const sendPatientNotification = useCallback(async (data: { type: NotificationLog['type']; recipient: string; message: string }) => {
    const created = await notificationsApi.sendNotification(data)
    setNotificationLogs((prev: NotificationLog[]) => [created, ...prev])
    return created
  }, [])

  const refreshNotificationLogs = useCallback(async () => {
    if (user?.role !== 'admin') return
    const logs = await notificationsApi.getNotifications()
    setNotificationLogs(logs)
  }, [user?.role])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      totalPatients:          patients.length,
      totalAppointmentsToday: appointments.filter(a => a.date?.substring(0, 10) === today).length,
      totalRevenue:           invoices.reduce((s, i) => s + i.paidAmount, 0),
      pendingPayments:        invoices.reduce((s, i) => s + i.remainingAmount, 0),
    }
  }, [patients, appointments, invoices])

  if (backendOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔌</div>
          <h2 className="text-xl font-bold text-primary mb-2">Serveri nuk është aktiv</h2>
          <p className="text-muted-foreground mb-6">
            Nuk mund të lidhemi me serverin backend në <strong>localhost:5000</strong>.
            Ju lutem nisni serverin dhe provoni përsëri.
          </p>
          <div className="bg-secondary/60 rounded-xl p-4 text-left text-sm font-mono mb-6 text-muted-foreground">
            <p>cd backend</p>
            <p>node server.js</p>
          </div>
          <button
            onClick={() => { setBackendOffline(false); window.location.reload() }}
            className="px-6 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
          >
            Provo Përsëri
          </button>
        </div>
      </div>
    )
  }

  return (
    <DataContext.Provider value={{
      isDataLoading,
      backendOffline,
      patients,   addPatient,   updatePatient,   deletePatient,   getPatient,   refreshPatients,
      appointments, addAppointment, updateAppointment, deleteAppointment, getAppointmentsByDate, getAppointmentsByDoctor, refreshAppointments,
      treatments, addTreatment, updateTreatment, deleteTreatment, getTreatmentsByPatient, refreshTreatments,
      invoices,   addInvoice,   updateInvoice,   deleteInvoice,   addPayment,   refreshInvoices,
      staff,      addStaff,     updateStaff,     deleteStaff,     refreshStaff,
      auditLogs,  addAuditLog,  refreshAuditLogs,
      appNotifications, unreadCount: appNotifications.filter(n => !n.isRead).length,
      markNotificationRead, markAllNotificationsRead,
      dailyTransactions, addTransaction, refreshTransactions,
      prescriptions, addPrescription, refreshPrescriptions,
      documents,  addDocument,  addDocumentsBatch,  deleteDocument,  getDocumentsByPatient, refreshDocuments,
      services,   addService,   updateService,   deleteService,   refreshServices,
      rooms,      addRoom,      updateRoom,      deleteRoom,      refreshRooms,
      patientServices, addPatientService, deletePatientService, markPatientServiceInvoiced,
      getPatientServicesByPatient, refreshPatientServices,
      notificationLogs, sendPatientNotification, refreshNotificationLogs,
      getStats,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
