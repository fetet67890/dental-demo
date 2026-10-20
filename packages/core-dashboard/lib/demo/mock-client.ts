// Front-end-only demo interceptor — everything lib/api-client.ts's request()
// would normally send over the network gets routed here instead when
// NEXT_PUBLIC_DEMO_MODE is on. One in-memory copy of lib/demo/fixtures.ts,
// seeded on module load and mutated by create/update/delete calls for the
// rest of this tab's life — a page reload wipes it back to the seed. That's
// deliberate: "functional, but nothing stored" (see Hypocrates-Todo.md).
//
// Coverage is intentionally uneven, not a full re-implementation of the real
// API: the resources a sales walkthrough actually touches (auth, dashboard,
// patients, appointments, staff, services, invoices, inventory, treatments,
// prescriptions, clinic branding/settings) are hand-mocked with realistic
// behavior — reads reflect prior writes, writes validate roughly like the
// real endpoints do. Everything else falls through to the generic handler
// at the bottom: GETs return an empty list, writes "succeed" and echo the
// request body back with a generated id. The goal there isn't full fidelity,
// it's that clicking into a not-yet-hand-mocked corner during a demo never
// throws a raw network error — see Hypocrates-Todo.md for the running list
// of what's still generic vs. hand-mocked.
import {
  DEMO_USERS, DEMO_PATIENTS, DEMO_APPOINTMENTS, DEMO_STAFF, DEMO_SERVICES,
  DEMO_INVOICES, DEMO_TREATMENTS, DEMO_PRESCRIPTIONS, DEMO_INVENTORY,
  DEMO_CLINIC_SETTINGS, DEMO_QUEUE, DEMO_WAITLIST, DEMO_SERVICE_PACKAGES,
  DEMO_PACKAGE_PURCHASES, buildDashboardStats, type DemoInventoryItem,
} from '@/lib/demo/fixtures'
import type { Patient, Appointment, Staff, Service, Invoice, Treatment, Prescription, User } from '@core/types'
// Imported from these files' dependency-free .types siblings, not the files
// themselves (lib/api/queue.ts etc.) — those import ../api-client, which
// imports this module, so importing straight from them here closed a real
// circular dependency (webpack: "Circular dependency between chunks with
// runtime"). The .types files have no imports of their own, so this stays
// acyclic while the re-exports from lib/api/queue.ts etc. keep every other
// consumer's import path unchanged.
import type { QueueEntry } from '@core/lib/api/queue.types'
import type { WaitlistEntry } from '@core/lib/api/waitlist.types'
import type { ServicePackage } from '@core/lib/api/service-packages.types'
import type { PackagePurchase } from '@core/lib/api/package-purchases.types'

export class MockHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'MockHttpError'
  }
}

// In-memory session state — plain module-level arrays, intentionally not
// persisted anywhere (no localStorage, no IndexedDB). Spread copies of the
// fixtures so repeated demoRequest calls mutate this, never the fixtures
// module itself (which would leak between page reloads via HMR/module cache
// in dev, and just be bad hygiene in prod).
let patients = [...DEMO_PATIENTS]
let appointments = [...DEMO_APPOINTMENTS]
let staff = [...DEMO_STAFF]
let services = [...DEMO_SERVICES]
let invoices = [...DEMO_INVOICES]
let treatments = [...DEMO_TREATMENTS]
let prescriptions = [...DEMO_PRESCRIPTIONS]
let inventory = [...DEMO_INVENTORY]
let queue = [...DEMO_QUEUE]
let waitlist = [...DEMO_WAITLIST]
let servicePackages = [...DEMO_SERVICE_PACKAGES]
let packagePurchases = [...DEMO_PACKAGE_PURCHASES]
const clinicSettings = { ...DEMO_CLINIC_SETTINGS }
// Small stateful settings objects — see the "Recalls/debt-alerts/
// appointment-reminders settings" comment below for why these need to be
// real mutable state (PUT-then-echo) rather than a fixed GET-only default.
const recallSettings = { intervalMonths: 6, enabled: false }
const debtAlertSettings = { intervalDays: 7, enabled: false }
const appointmentReminderSettings = { leadHours: 24, enabled: false }
// Keyed by userId — nothing seeded here on purpose, everyone starts the
// session not-yet-clocked-in, same as a real day.
const attendanceByUser: Record<string, { id: string; userId: string; date: string; clockIn: string | null; clockOut: string | null; workMode: string | null; workModeSkipped: boolean }> = {}

function wait(): Promise<void> {
  // Enough to feel like a real round-trip, never long enough to feel slow.
  return new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 300))
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function parseBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== 'string') return {}
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

function currentUser(headers: Record<string, string>): User | null {
  const auth = headers['Authorization'] || headers['authorization']
  if (!auth?.startsWith('Bearer demo-token:')) return null
  const email = decodeURIComponent(auth.slice('Bearer demo-token:'.length))
  return DEMO_USERS[email]?.user ?? null
}

function requireAuth(headers: Record<string, string>): User {
  const user = currentUser(headers)
  if (!user) throw new MockHttpError(401, 'Sesioni ka skaduar')
  return user
}

function patientName(p: Patient) {
  return `${p.firstName} ${p.lastName}`
}

// A handful of routes take a segment ID in the middle (e.g. .../payments,
// .../adjust) — this only needs to strip a known suffix off the end, not a
// full router, given how few of these exist.
function idFrom(path: string, prefix: string, suffix = ''): string | null {
  if (!path.startsWith(prefix)) return null
  let rest = path.slice(prefix.length)
  if (suffix) {
    if (!rest.endsWith(suffix)) return null
    rest = rest.slice(0, -suffix.length)
  }
  return rest || null
}

export async function demoRequest<T>(
  path: string,
  options: RequestInit & { headers: Record<string, string> }
): Promise<T> {
  await wait()

  const method = (options.method || 'GET').toUpperCase()
  const [rawPath, queryString] = path.split('?')
  const query = new URLSearchParams(queryString || '')
  const body = parseBody(options.body)
  const headers = options.headers

  // ── Auth ───────────────────────────────────────────────────────────────
  if (method === 'POST' && rawPath === '/api/auth/login') {
    const { email, password } = body as { email?: string; password?: string }
    const account = email ? DEMO_USERS[email] : undefined
    if (!account || account.password !== password) {
      throw new MockHttpError(401, 'Email ose fjalëkalim i pasaktë')
    }
    return { token: `demo-token:${encodeURIComponent(email!)}`, user: account.user } as T
  }
  if (method === 'GET' && rawPath === '/api/auth/me') {
    return { user: requireAuth(headers) } as T
  }
  if (method === 'PUT' && rawPath === '/api/auth/profile') {
    const user = requireAuth(headers)
    return { user: { ...user, ...body } } as T
  }
  if (rawPath === '/api/auth/avatar') {
    const user = requireAuth(headers)
    return { user: { ...user, avatar: method === 'DELETE' ? undefined : '/logo.png' } } as T
  }

  // ── Dashboard ────────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/dashboard/stats') {
    return buildDashboardStats() as T
  }
  if (method === 'GET' && rawPath === '/api/dashboard/revenue-forecast') {
    const stats = buildDashboardStats()
    return {
      history: stats.monthlyRevenue,
      forecast: [],
      trend: { slope: 1, direction: 'up' },
      insufficientData: false,
    } as T
  }

  // ── Patients ─────────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/patients') {
    const search = (query.get('search') || '').toLowerCase()
    const status = query.get('status')
    return patients.filter((p) =>
      (!search || patientName(p).toLowerCase().includes(search) || p.phone.includes(search)) &&
      (!status || p.status === status) &&
      !p.archived
    ) as T
  }
  if (method === 'GET' && rawPath === '/api/patients/archived') {
    return patients.filter((p) => p.archived) as T
  }
  if (method === 'POST' && rawPath === '/api/patients') {
    const created: Patient = { id: genId('demo-p'), createdAt: new Date().toISOString().slice(0, 10), medicalHistory: [], allergies: [], status: 'aktiv', ...(body as Partial<Patient>) } as Patient
    patients = [created, ...patients]
    return created as T
  }
  if (rawPath.startsWith('/api/patients/')) {
    const id = idFrom(rawPath, '/api/patients/', '/archive') || idFrom(rawPath, '/api/patients/', '/restore') || idFrom(rawPath, '/api/patients/')
    const existing = patients.find((p) => p.id === id)
    if (method === 'GET' && existing) return existing as T
    if (method === 'PUT' && existing) {
      const updated = { ...existing, ...body }
      patients = patients.map((p) => (p.id === id ? updated : p))
      return updated as T
    }
    if (method === 'DELETE' && existing) {
      patients = patients.filter((p) => p.id !== id)
      return undefined as T
    }
    if (rawPath.endsWith('/archive') && existing) {
      const updated = { ...existing, archived: true, archivedAt: new Date().toISOString() }
      patients = patients.map((p) => (p.id === id ? updated : p))
      return updated as T
    }
    if (rawPath.endsWith('/restore') && existing) {
      const updated = { ...existing, archived: false, archivedAt: undefined }
      patients = patients.map((p) => (p.id === id ? updated : p))
      return updated as T
    }
    if (existing) return existing as T // portal-status/anonymize/etc. — safe generic patient echo
  }

  // ── Appointments ─────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/appointments') {
    const date = query.get('date')
    const doctorId = query.get('doctorId')
    const patientId = query.get('patientId')
    const status = query.get('status')
    return appointments.filter((a) =>
      (!date || a.date === date) && (!doctorId || a.doctorId === doctorId) &&
      (!patientId || a.patientId === patientId) && (!status || a.status === status)
    ) as T
  }
  if (method === 'POST' && rawPath === '/api/appointments') {
    const patient = patients.find((p) => p.id === body.patientId)
    const created: Appointment = { id: genId('demo-a'), status: 'planifikuar', patientName: patient ? patientName(patient) : '', ...body } as Appointment
    appointments = [created, ...appointments]
    return created as T
  }
  if (rawPath.startsWith('/api/appointments/')) {
    const id = idFrom(rawPath, '/api/appointments/')
    const existing = appointments.find((a) => a.id === id)
    if (method === 'GET' && existing) return existing as T
    if (method === 'PUT' && existing) {
      const updated = { ...existing, ...body }
      appointments = appointments.map((a) => (a.id === id ? updated : a))
      return updated as T
    }
    if (method === 'DELETE') {
      appointments = appointments.filter((a) => a.id !== id)
      return undefined as T
    }
  }

  // ── Staff ────────────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/staff') {
    return staff as T
  }
  if (method === 'POST' && rawPath === '/api/staff') {
    const created: Staff = { id: genId('demo-staff'), status: 'aktiv', joinedAt: new Date().toISOString().slice(0, 10), ...body } as Staff
    staff = [...staff, created]
    return created as T
  }
  if (rawPath.startsWith('/api/staff/')) {
    const id = idFrom(rawPath, '/api/staff/', '/password') || idFrom(rawPath, '/api/staff/', '/commission-rates') || idFrom(rawPath, '/api/staff/')
    const existing = staff.find((s) => s.id === id)
    if (rawPath.endsWith('/password')) return { success: true } as T
    if (rawPath.endsWith('/commission-rates')) return (method === 'GET' ? [] : body.rates) as T
    if (method === 'GET' && existing) return existing as T
    if (method === 'PUT' && existing) {
      const updated = { ...existing, ...body }
      staff = staff.map((s) => (s.id === id ? updated : s))
      return updated as T
    }
    if (method === 'DELETE') {
      staff = staff.filter((s) => s.id !== id)
      return undefined as T
    }
  }

  // ── Services ─────────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/services') {
    return services as T
  }
  if (method === 'POST' && rawPath === '/api/services') {
    const created: Service = { id: genId('demo-s'), isActive: true, ...body } as Service
    services = [...services, created]
    return created as T
  }
  if (rawPath.startsWith('/api/services/')) {
    const id = idFrom(rawPath, '/api/services/')
    const existing = services.find((s) => s.id === id)
    if (method === 'PUT' && existing) {
      const updated = { ...existing, ...body }
      services = services.map((s) => (s.id === id ? updated : s))
      return updated as T
    }
    if (method === 'DELETE') {
      services = services.filter((s) => s.id !== id)
      return undefined as T
    }
  }

  // ── Invoices ─────────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/invoices') {
    return invoices as T
  }
  if (method === 'POST' && rawPath === '/api/invoices') {
    const patient = patients.find((p) => p.id === body.patientId)
    const totalAmount = Number(body.totalAmount ?? 0)
    const created: Invoice = {
      id: genId('demo-inv'), patientName: patient ? patientName(patient) : '', paidAmount: 0,
      remainingAmount: totalAmount, status: 'papaguar', createdAt: new Date().toISOString().slice(0, 10),
      payments: [], treatments: [], ...(body as Partial<Invoice>), totalAmount,
    } as Invoice
    invoices = [created, ...invoices]
    return created as T
  }
  if (rawPath.startsWith('/api/invoices/')) {
    const paymentsId = idFrom(rawPath, '/api/invoices/', '/payments')
    const id = paymentsId || idFrom(rawPath, '/api/invoices/')
    const existing = invoices.find((i) => i.id === id)
    if (!existing) { /* fall through to generic handler below */ }
    else if (paymentsId && method === 'POST') {
      const amount = Number(body.amount ?? 0)
      const paidAmount = existing.paidAmount + amount
      const remainingAmount = Math.max(0, existing.totalAmount - paidAmount)
      const updated: Invoice = {
        ...existing, paidAmount, remainingAmount,
        status: remainingAmount === 0 ? 'paguar' : 'pjeserisht',
        payments: [...existing.payments, { id: genId('demo-pay'), invoiceId: existing.id, amount, method: (body.method as Invoice['payments'][number]['method']) || 'cash', date: new Date().toISOString().slice(0, 10) }],
      }
      invoices = invoices.map((i) => (i.id === id ? updated : i))
      return updated as T
    } else if (method === 'GET') return existing as T
    else if (method === 'PUT') {
      const updated = { ...existing, ...body }
      invoices = invoices.map((i) => (i.id === id ? updated : i))
      return updated as T
    } else if (method === 'DELETE') {
      invoices = invoices.filter((i) => i.id !== id)
      return undefined as T
    }
  }

  // ── Inventory ────────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/inventory') {
    return inventory as T
  }
  if (method === 'POST' && rawPath === '/api/inventory') {
    const created = { id: genId('demo-inv-item'), expiryStatus: 'ok', ...(body as Partial<DemoInventoryItem>) } as DemoInventoryItem
    inventory = [...inventory, created]
    return created as T
  }
  if (rawPath.startsWith('/api/inventory/')) {
    const adjustId = idFrom(rawPath, '/api/inventory/', '/adjust')
    const id = adjustId || idFrom(rawPath, '/api/inventory/')
    const existing = inventory.find((i) => i.id === id)
    if (existing && adjustId && method === 'PATCH') {
      const updated = { ...existing, quantity: existing.quantity + Number(body.delta ?? 0) }
      inventory = inventory.map((i) => (i.id === id ? updated : i))
      return updated as T
    }
    if (existing && method === 'PUT') {
      const updated = { ...existing, ...body }
      inventory = inventory.map((i) => (i.id === id ? updated : i))
      return updated as T
    }
    if (method === 'DELETE') {
      inventory = inventory.filter((i) => i.id !== id)
      return undefined as T
    }
  }

  // ── Treatments ───────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/treatments') {
    const patientId = query.get('patientId')
    return treatments.filter((t) => !patientId || t.patientId === patientId) as T
  }
  if (method === 'GET' && rawPath === '/api/treatments/stats') {
    // Was shaped { total, totalCost } — doesn't match the real
    // TreatmentStats interface at all ({ type, count, avgCost, minCost,
    // maxCost }); harmless only because nothing happened to read this one
    // yet. Fixed to the real shape now that the assistant-usage-status and
    // attendance bugs showed how quickly a wrong shape becomes a real crash.
    const type = query.get('type') || ''
    const costs = treatments.filter((t) => t.type === type && t.status === 'perfunduar').map((t) => t.cost)
    const avg = costs.length ? costs.reduce((s, c) => s + c, 0) / costs.length : null
    return { type, count: costs.length, avgCost: avg, minCost: costs.length ? Math.min(...costs) : null, maxCost: costs.length ? Math.max(...costs) : null } as T
  }
  if (method === 'POST' && rawPath === '/api/treatments') {
    const patient = patients.find((p) => p.id === body.patientId)
    const created: Treatment = { id: genId('demo-t'), status: 'planifikuar', patientName: patient ? patientName(patient) : '', date: new Date().toISOString().slice(0, 10), ...body } as Treatment
    treatments = [created, ...treatments]
    return created as T
  }
  if (rawPath.startsWith('/api/treatments/')) {
    const id = idFrom(rawPath, '/api/treatments/')
    const existing = treatments.find((t) => t.id === id)
    if (method === 'GET' && existing) return existing as T
    if (method === 'PUT' && existing) {
      const updated = { ...existing, ...body }
      treatments = treatments.map((t) => (t.id === id ? updated : t))
      return updated as T
    }
    if (method === 'DELETE') {
      treatments = treatments.filter((t) => t.id !== id)
      return undefined as T
    }
  }

  // ── Prescriptions ────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/prescriptions') {
    const patientId = query.get('patientId')
    return prescriptions.filter((p) => !patientId || p.patientId === patientId) as T
  }
  if (method === 'POST' && rawPath === '/api/prescriptions') {
    const patient = patients.find((p) => p.id === body.patientId)
    const created: Prescription = { id: genId('demo-rx'), patientName: patient ? patientName(patient) : '', issuedDate: new Date().toISOString().slice(0, 10), ...body } as Prescription
    prescriptions = [created, ...prescriptions]
    return created as T
  }
  if (rawPath.startsWith('/api/prescriptions/')) {
    const id = idFrom(rawPath, '/api/prescriptions/')
    if (method === 'GET') return prescriptions.find((p) => p.id === id) as T
    if (method === 'DELETE') {
      prescriptions = prescriptions.filter((p) => p.id !== id)
      return undefined as T
    }
  }

  // ── Queue (front-desk) — hand-mocked, not just a generic empty list, so a
  // sales walkthrough of Recepsion → Radha shows a live-looking queue with
  // real state transitions (call → thirrur, mark done → perfunduar) instead
  // of a permanently-empty screen. ──────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/queue') {
    const includeDone = query.get('includeDone') === 'true'
    return queue.filter((q) => includeDone || (q.status !== 'perfunduar' && q.status !== 'anuluar')) as T
  }
  if (method === 'POST' && rawPath === '/api/queue') {
    const patient = patients.find((p) => p.id === body.patientId)
    const created: QueueEntry = {
      id: genId('demo-q'), status: 'duke_pritur', priority: false,
      patientName: patient ? patientName(patient) : '', checkedInAt: new Date().toISOString(),
      ...(body as Partial<QueueEntry>),
    } as QueueEntry
    queue = [...queue, created]
    return created as T
  }
  if (rawPath.startsWith('/api/queue/')) {
    const callId = idFrom(rawPath, '/api/queue/', '/call')
    const statusId = idFrom(rawPath, '/api/queue/', '/status')
    const id = callId || statusId || idFrom(rawPath, '/api/queue/')
    const existing = queue.find((q) => q.id === id)
    if (existing && callId && method === 'PATCH') {
      const doctor = staff.find((s) => s.id === body.doctorId)
      const updated: QueueEntry = { ...existing, status: 'thirrur', doctorId: body.doctorId as string, doctorName: doctor?.name, calledAt: new Date().toISOString() }
      queue = queue.map((q) => (q.id === id ? updated : q))
      return updated as T
    }
    if (existing && statusId && method === 'PATCH') {
      const status = body.status as QueueEntry['status']
      const done = status === 'perfunduar' || status === 'anuluar'
      const updated: QueueEntry = { ...existing, status, completedAt: done ? new Date().toISOString() : existing.completedAt }
      queue = queue.map((q) => (q.id === id ? updated : q))
      return updated as T
    }
    if (method === 'DELETE') {
      queue = queue.filter((q) => q.id !== id)
      return undefined as T
    }
  }

  // ── Waitlist ─────────────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/api/waitlist') {
    return waitlist as T
  }
  if (method === 'POST' && rawPath === '/api/waitlist') {
    const patient = patients.find((p) => p.id === body.patientId)
    const created: WaitlistEntry = {
      id: genId('demo-w'), status: 'aktiv', patientName: patient ? patientName(patient) : '',
      createdAt: new Date().toISOString(), ...(body as Partial<WaitlistEntry>),
    } as WaitlistEntry
    waitlist = [created, ...waitlist]
    return created as T
  }
  if (rawPath.startsWith('/api/waitlist/')) {
    const statusId = idFrom(rawPath, '/api/waitlist/', '/status')
    const id = statusId || idFrom(rawPath, '/api/waitlist/')
    const existing = waitlist.find((w) => w.id === id)
    if (existing && statusId && method === 'PATCH') {
      const status = body.status as WaitlistEntry['status']
      const updated: WaitlistEntry = { ...existing, status, notifiedAt: status === 'njoftuar' ? new Date().toISOString() : existing.notifiedAt }
      waitlist = waitlist.map((w) => (w.id === id ? updated : w))
      return updated as T
    }
    if (method === 'DELETE') {
      waitlist = waitlist.filter((w) => w.id !== id)
      return undefined as T
    }
  }

  // ── Service packages (catalog) + package purchases (a patient's own
  // sold/redeemed sessions) — two related resources, both hand-mocked
  // together since neither means anything without the other in a demo. ──
  if (method === 'GET' && rawPath === '/api/service-packages') {
    const activeOnly = query.get('activeOnly') === 'true'
    return (activeOnly ? servicePackages.filter((p) => p.isActive) : servicePackages) as T
  }
  if (method === 'POST' && rawPath === '/api/service-packages') {
    const created: ServicePackage = { id: genId('demo-pkg'), isActive: true, sortOrder: servicePackages.length, ...(body as Partial<ServicePackage>) } as ServicePackage
    servicePackages = [...servicePackages, created]
    return created as T
  }
  if (rawPath.startsWith('/api/service-packages/')) {
    const id = idFrom(rawPath, '/api/service-packages/')
    const existing = servicePackages.find((p) => p.id === id)
    if (existing && method === 'PUT') {
      const updated = { ...existing, ...body }
      servicePackages = servicePackages.map((p) => (p.id === id ? updated : p))
      return updated as T
    }
    if (method === 'DELETE') {
      servicePackages = servicePackages.filter((p) => p.id !== id)
      return undefined as T
    }
  }
  if (method === 'GET' && rawPath === '/api/package-purchases') {
    const patientId = query.get('patientId')
    return packagePurchases.filter((p) => !patientId || p.patientId === patientId) as T
  }
  if (method === 'POST' && rawPath === '/api/package-purchases') {
    const pkg = servicePackages.find((p) => p.id === body.packageId)
    const created: PackagePurchase = {
      id: genId('demo-pp'), patientId: body.patientId as string, packageId: pkg?.id,
      packageName: pkg?.name ?? '', serviceId: pkg?.serviceId ?? '', serviceName: pkg?.serviceName ?? '',
      sessionsTotal: pkg?.sessionCount ?? 0, sessionsUsed: 0, pricePaid: pkg?.price ?? 0,
      purchasedAt: new Date().toISOString().slice(0, 10), status: 'active',
    }
    packagePurchases = [created, ...packagePurchases]
    return created as T
  }
  if (rawPath.startsWith('/api/package-purchases/') && rawPath.endsWith('/redeem') && method === 'POST') {
    const id = idFrom(rawPath, '/api/package-purchases/', '/redeem')
    const existing = packagePurchases.find((p) => p.id === id)
    if (existing) {
      const sessionsUsed = existing.sessionsUsed + 1
      const updated: PackagePurchase = { ...existing, sessionsUsed, status: sessionsUsed >= existing.sessionsTotal ? 'completed' : 'active' }
      packagePurchases = packagePurchases.map((p) => (p.id === id ? updated : p))
      return updated as T
    }
  }

  // ── Attendance ───────────────────────────────────────────────────────
  // getAttendance() (admin/stafi's "Today" grid) is the one that actually
  // crashed the Staff page: it types its return as { date, staff: [...] },
  // but the generic fallback below just returns [] for anything unmocked —
  // an array has no `.staff`, so `res.staff` was undefined, and the page
  // crashed reading `.length` off that on the very next render. Same root
  // cause as the assistant-usage-status crash, different page. Every
  // attendance endpoint gets a real mock here now, not just this one, since
  // getMyAttendance() has the identical shape mismatch risk in the topbar
  // (survives today only because every read of it happens to use `?.`  —
  // too fragile to leave as the only thing standing between it and the same
  // crash).
  if (method === 'GET' && rawPath === '/api/attendance/me') {
    const me = currentUser(headers)
    const rec = me ? attendanceByUser[me.id] : undefined
    return (rec ?? null) as T
  }
  if (method === 'POST' && rawPath === '/api/attendance/clock-in') {
    const me = requireAuth(headers)
    const rec = { id: `demo-att-${me.id}`, userId: me.id, date: new Date().toISOString().slice(0, 10), clockIn: new Date().toISOString(), clockOut: null, workMode: attendanceByUser[me.id]?.workMode ?? null, workModeSkipped: attendanceByUser[me.id]?.workModeSkipped ?? false }
    attendanceByUser[me.id] = rec
    return rec as T
  }
  if (method === 'POST' && rawPath === '/api/attendance/clock-out') {
    const me = requireAuth(headers)
    const existing = attendanceByUser[me.id]
    const rec = { id: `demo-att-${me.id}`, userId: me.id, date: new Date().toISOString().slice(0, 10), clockIn: existing?.clockIn ?? new Date().toISOString(), clockOut: new Date().toISOString(), workMode: existing?.workMode ?? null, workModeSkipped: existing?.workModeSkipped ?? false }
    attendanceByUser[me.id] = rec
    return rec as T
  }
  if (method === 'POST' && rawPath === '/api/attendance/work-mode') {
    const me = requireAuth(headers)
    const mode = body.mode as string
    const existing = attendanceByUser[me.id]
    const rec = { id: `demo-att-${me.id}`, userId: me.id, date: new Date().toISOString().slice(0, 10), clockIn: existing?.clockIn ?? null, clockOut: existing?.clockOut ?? null, workMode: mode === 'skip' ? null : mode, workModeSkipped: mode === 'skip' }
    attendanceByUser[me.id] = rec
    return rec as T
  }
  if (rawPath.startsWith('/api/attendance/') && rawPath.endsWith('/work-mode') && method === 'PUT') {
    const userId = idFrom(rawPath, '/api/attendance/', '/work-mode')!
    const existing = attendanceByUser[userId]
    const rec = { id: `demo-att-${userId}`, userId, date: (body.date as string) || new Date().toISOString().slice(0, 10), clockIn: existing?.clockIn ?? null, clockOut: existing?.clockOut ?? null, workMode: (body.mode as string | null) ?? null, workModeSkipped: false }
    attendanceByUser[userId] = rec
    return rec as T
  }
  if (method === 'GET' && rawPath === '/api/attendance') {
    const date = query.get('date') || new Date().toISOString().slice(0, 10)
    return {
      date,
      staff: staff.map((s) => {
        const rec = attendanceByUser[s.id]
        return { userId: s.id, name: s.name, role: s.role, clockIn: rec?.clockIn ?? null, clockOut: rec?.clockOut ?? null, workMode: rec?.workMode ?? null, workModeSkipped: rec?.workModeSkipped ?? false }
      }),
    } as T
  }
  if (method === 'GET' && rawPath === '/api/attendance/risk') {
    return [] as T // real shape is already an array — the generic fallback below is correct for this one
  }

  // ── Other single-object endpoints — same "wrong-shaped [] crashes a
  // render" risk as the two bugs above, hand-mocked here with correctly-
  // shaped, mostly-empty/zeroed fixtures (not rich demo data — these are
  // secondary reports/settings screens, not the core walkthrough) so
  // visiting any of them can't crash the page even though none of them
  // have realistic numbers behind them yet. ──────────────────────────────
  if (method === 'GET' && rawPath === '/api/audit/count') return { total: 0 } as T
  if (method === 'GET' && rawPath === '/api/cash-reconciliation/today') {
    return { date: new Date().toISOString().slice(0, 10), record: null, cashIn: 0, cashOut: 0 } as T
  }
  if (method === 'GET' && rawPath.startsWith('/api/commissions')) {
    return { basis: 'cost', from: query.get('from') || '', to: query.get('to') || '', staff: [] } as T
  }
  // Recalls/debt-alerts/appointment-reminders settings — was GET-only
  // (fixed defaults, no PUT handler), so toggling one field via
  // updateXSettings({ field }) fell through to the generic PUT fallback,
  // which just echoes the request body back — losing every field the
  // caller didn't send this time (e.g. toggling `enabled` on, then
  // changing `intervalMonths`, silently reset `enabled` back to undefined
  // since that PUT's body never mentioned it). Not a crash like the
  // appointment-reminders one below, but a real "your last change
  // silently un-did itself" bug — a real stateful object each, mutated by
  // PUT, exactly like clinicSettings above.
  if (rawPath === '/api/recalls/settings') {
    if (method === 'PUT') Object.assign(recallSettings, body)
    return recallSettings as T
  }
  if (method === 'GET' && rawPath === '/api/recalls/due') return { intervalMonths: recallSettings.intervalMonths, count: 0, patients: [] } as T
  if (rawPath === '/api/debt-alerts/settings') {
    if (method === 'PUT') Object.assign(debtAlertSettings, body)
    return debtAlertSettings as T
  }
  if (method === 'GET' && rawPath === '/api/debt-alerts/due') return { intervalDays: debtAlertSettings.intervalDays, count: 0, invoices: [] } as T
  // appointment-reminders — the real bug: /due was never hand-mocked at
  // all, so it fell through to the generic `[] as T` GET fallback.
  // appointment-reminders-section.tsx does `setDue(d.appointments)` on
  // that result — `([]).appointments` is `undefined`, and the same
  // component later reads `due.length`/`due.map(...)` unconditionally
  // (no `?.`, no loading guard once `loading` flips false) — an actual
  // crash opening Rikujtesat's Appointments tab in demo mode, same class
  // of bug as the assistant-usage-status/attendance ones elsewhere in
  // this file, just not caught until this pass.
  if (rawPath === '/api/appointment-reminders/settings') {
    if (method === 'PUT') Object.assign(appointmentReminderSettings, body)
    return appointmentReminderSettings as T
  }
  if (method === 'GET' && rawPath === '/api/appointment-reminders/due') {
    return { leadHours: appointmentReminderSettings.leadHours, count: 0, appointments: [] } as T
  }
  if (method === 'POST' && rawPath === '/api/appointment-reminders/send') return { skipped: true, sent: 0, failed: 0 } as T
  if (method === 'GET' && rawPath.startsWith('/api/patient-risk/')) {
    const patientId = idFrom(rawPath, '/api/patient-risk/')!
    const p = patients.find((pt) => pt.id === patientId)
    return {
      patientId, patientName: p ? patientName(p) : '', points: 0, level: 'ulet', reasons: [],
      breakdown: {
        financial: { points: 0, reasons: [], overdueAmount: 0, overdueCount: 0, maxDaysOverdue: 0 },
        engagement: { points: 0, reasons: [], isRecallDue: false, recallsIgnored: 0 },
        followups: { points: 0, reasons: [], overdueCount: 0 },
        // Every specialty's own risk-signal key would slot in here (Dental's
        // 'periodontal', Dermatology's 'lesions', etc. — see
        // patient-risk.js on the backend); the demo mock only needs some
        // key present since nothing in the UI reads this one by name (see
        // lib/api/patient-risk.ts's own comment on the same index signature).
        specialtySignal: { points: 0, reasons: [] },
        noShows: { points: 0, reasons: [], count: 0 },
      },
    } as T
  }
  if (method === 'GET' && rawPath === '/api/site-content/contact') return { address: '', phone: '', email: '', hours: '' } as T
  if (method === 'GET' && rawPath === '/api/site-content/announcement') return { message: '', isActive: false } as T
  if (method === 'GET' && rawPath === '/api/transactions/summary') {
    return { date: query.get('date') || new Date().toISOString().slice(0, 10), hyrese: 0, dalje: 0, balance: 0 } as T
  }
  if (method === 'GET' && rawPath.startsWith('/api/portal-admin/patients/') && rawPath.endsWith('/status')) {
    return { account: null } as T
  }

  // ── Clinic settings ──────────────────────────────────────────────────
  if (rawPath === '/api/settings/clinic') return clinicSettings as T
  if (rawPath === '/api/settings/exchange-rate') return { eur_to_lek: 116.5, rates: { ALL: 116.5 }, cached: true } as T
  if (method === 'PUT' && rawPath === '/api/settings/commission-basis') { Object.assign(clinicSettings, body); return { commission_basis: clinicSettings.commission_basis } as T }
  if (method === 'PUT' && rawPath === '/api/settings/theme') { Object.assign(clinicSettings, { theme_preset: body.preset, custom_theme_color: body.color ?? null }); return { theme_preset: clinicSettings.theme_preset, custom_theme_color: clinicSettings.custom_theme_color } as T }
  if (method === 'PUT' && rawPath === '/api/settings/surface') { Object.assign(clinicSettings, { theme_surface: body.surface }); return { theme_surface: clinicSettings.theme_surface } as T }
  if (method === 'PUT' && rawPath === '/api/settings/font') { Object.assign(clinicSettings, { theme_font: body.font }); return { theme_font: clinicSettings.theme_font } as T }
  if (method === 'PUT' && rawPath === '/api/settings/hours') { Object.assign(clinicSettings, { clinic_open_time: body.openTime, clinic_close_time: body.closeTime }); return { clinic_open_time: clinicSettings.clinic_open_time, clinic_close_time: clinicSettings.clinic_close_time } as T }
  if (method === 'PUT' && rawPath === '/api/settings/setup-wizard') { clinicSettings.setup_wizard_done = true; return { setup_wizard_done: true } as T }
  if (['/api/settings/logo', '/api/settings/favicon', '/api/settings/sidebar-icon', '/api/settings/chatbot-icon'].includes(rawPath)) {
    const key = rawPath.split('/').pop()!.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const field = `${key}_url`
    Object.assign(clinicSettings, { [field]: '/logo.png' })
    return { [field]: '/logo.png' } as T
  }

  // ── Demo reset — never a real wipe here, there's no real data to lose ───
  if (rawPath === '/api/admin/demo-reset/status') return { enabled: false } as T

  // ── Assistant usage status — rendered unconditionally in the topbar
  // (assistant-usage-badge.tsx) and the floating widget (assistant-
  // widget.tsx) on every single page, both with only a bare `if (!usage)
  // return null` guard — no defense against a wrong-shaped truthy value.
  // The generic array fallback below used to hit exactly that: `[]` is
  // truthy, so the guard passed, then `usage.spentThisMonthUSD.toFixed()`
  // crashed on undefined and took the whole page down. Hand-mocked here
  // because of that blast radius, not because it's otherwise a core demo
  // surface.
  if (method === 'GET' && rawPath === '/api/assistant/usage-status') {
    return { provider: 'anthropic', model: 'claude-haiku-4-5', tier: 'free', requestsToday: 3, requestsLastMinute: 0, dailyLimit: 50, percentUsed: 6 } as T
  }
  // The chat itself — reachable, not just theoretical: getIntegrations()
  // (assistant-widget.tsx's own config check) reports anthropic_api_key as
  // configured in demo mode (see INTEGRATION_DEFS' fakeValue on the
  // template's copy of this file), so the widget shows a real chat input,
  // not a "not configured" state. Without this, sending a message hit the
  // generic POST fallback (`{ id, ...body }`) — `res.reply` came back
  // `undefined` (an empty assistant bubble) and `res.messages` happened to
  // echo the request's own messages back (not a crash, just useless).
  // Actually calling an LLM is out of scope for a no-backend demo; this
  // returns one honest, static reply instead of a broken/empty one.
  if (method === 'POST' && rawPath === '/api/assistant/chat') {
    const { messages, locale } = body as { messages?: { role: string; content: unknown }[]; locale?: string }
    const reply = locale === 'en'
      ? "This is a sales demo, so I can't generate live answers here — the real assistant needs a configured AI provider, which this demo intentionally doesn't wire up. Everything else in the app is fully interactive though!"
      : 'Kjo është një demo shitjeje, prandaj nuk mund të gjeneroj përgjigje reale këtu — asistenti i vërtetë kërkon një ofrues AI të konfiguruar, çka kjo demo nuk e lidh me qëllim. Gjithçka tjetër në aplikacion është plotësisht interaktive!'
    return { reply, messages: [...(messages || []), { role: 'assistant', content: reply }], pendingAction: null } as T
  }

  // ── Generic fallback — never throws a raw network error for anything not
  // hand-mocked above; see the file header for why this matters mid-demo.
  // Only ever a list: a caller expecting a single object and getting a
  // truthy-but-empty [] is exactly how the assistant-usage-status crash
  // above happened — see Hypocrates-Todo.md for the standing list of
  // single-object endpoints still worth hand-mocking if one of them turns
  // out to be rendered somewhere unconditional like that one was. ──
  if (method === 'GET') return [] as T
  if (method === 'DELETE') return undefined as T
  return { id: genId('demo'), ...body } as T
}
