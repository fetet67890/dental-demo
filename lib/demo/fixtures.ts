// Static seed data for the front-end-only sales demo (NEXT_PUBLIC_DEMO_MODE).
// Every person's name below is a plain "Test N" placeholder on purpose — no
// real or invented Albanian names, so nothing here could ever be mistaken
// for a real patient/staff record. Login credentials still match the
// existing DEMO_ACCOUNTS quick-login buttons on the /hyrje page exactly
// (same emails/passwords), so those buttons work unchanged against the mock
// client — see lib/demo/mock-client.ts.
import type { Patient, Appointment, Treatment, Invoice, Staff, Service, Prescription, User } from '@core/types'
import type { QueueEntry } from '@core/lib/api/queue.types'
import type { WaitlistEntry } from '@core/lib/api/waitlist.types'
import type { ServicePackage } from '@core/lib/api/service-packages.types'
import type { PackagePurchase } from '@core/lib/api/package-purchases.types'

export const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@hypocrates.local': {
    password: 'Admin123!',
    user: { id: 'demo-u-admin', email: 'admin@hypocrates.local', name: 'Test 1', role: 'admin', canAddStaff: true },
  },
  'doktor@hypocrates.local': {
    password: 'Doktor123!',
    user: { id: 'demo-u-doktor1', email: 'doktor@hypocrates.local', name: 'Test 2', role: 'mjek' },
  },
  'doktor2@hypocrates.local': {
    password: 'Doktor2123!',
    user: { id: 'demo-u-doktor2', email: 'doktor2@hypocrates.local', name: 'Test 3', role: 'mjek' },
  },
  'recepsion@hypocrates.local': {
    password: 'Recepsion123!',
    user: { id: 'demo-u-recepsion', email: 'recepsion@hypocrates.local', name: 'Test 4', role: 'recepsion' },
  },
}

const DOCTOR1 = DEMO_USERS['doktor@hypocrates.local'].user
const DOCTOR2 = DEMO_USERS['doktor2@hypocrates.local'].user

// Dates relative to "today" so the demo always looks current no matter when
// it's shown, instead of a fixed calendar date drifting further into the
// past every time someone runs it.
const today = new Date()
const iso = (offsetDays: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
const isoAt = (offsetYears: number) => {
  const d = new Date(today)
  d.setFullYear(d.getFullYear() - offsetYears)
  return d.toISOString().slice(0, 10)
}

export const DEMO_STAFF: Staff[] = [
  { id: 'demo-u-admin',     name: 'Test 1', email: 'admin@hypocrates.local',     role: 'admin',     phone: '+383 44 100 200', status: 'aktiv', joinedAt: isoAt(4), canAddStaff: true },
  { id: 'demo-u-doktor1',   name: 'Test 2', email: 'doktor@hypocrates.local',    role: 'mjek',      phone: '+383 44 100 201', status: 'aktiv', joinedAt: isoAt(3), specialization: 'Ortodonci', commissionEnabled: true, commissionRateType: 'per_service', commissionRate: 15 },
  { id: 'demo-u-doktor2',   name: 'Test 3', email: 'doktor2@hypocrates.local',   role: 'mjek',      phone: '+383 44 100 202', status: 'aktiv', joinedAt: isoAt(2), specialization: 'Endodonci', commissionEnabled: true, commissionRateType: 'per_service', commissionRate: 12 },
  { id: 'demo-u-recepsion', name: 'Test 4', email: 'recepsion@hypocrates.local', role: 'recepsion', phone: '+383 44 100 203', status: 'aktiv', joinedAt: isoAt(1) },
]

export const DEMO_SERVICES: Service[] = [
  { id: 'demo-s-1', name: 'Kontroll i Përgjithshëm', description: 'Ekzaminim rutinë dhe vlerësim', price: 2000, duration: 30, category: 'Dentistria e Përgjithshme', isActive: true },
  { id: 'demo-s-2', name: 'Pastrim Dhëmbësh',         description: 'Pastrim profesional dhe poliim', price: 4000, duration: 45, category: 'Dentistria e Përgjithshme', isActive: true },
  { id: 'demo-s-3', name: 'Zbardhim Dhëmbësh',        description: 'Zbardhim profesional në klinikë', price: 12000, duration: 60, category: 'Estetikë', isActive: true },
  { id: 'demo-s-4', name: 'Mbushje Dentare',          description: 'Mbushje kompozite për një dhëmb', price: 5000, duration: 40, category: 'Dentistria e Përgjithshme', isActive: true },
  { id: 'demo-s-5', name: 'Konsultë Ortodontike',     description: 'Vlerësim fillestar për aparat dhëmbësh', price: 3000, duration: 30, category: 'Ortodonci', isActive: true },
  { id: 'demo-s-6', name: 'Trajtim Kanalar',          description: 'Trajtim endodontik i kanalit rrënjor', price: 15000, duration: 90, category: 'Endodonci', isActive: true },
  { id: 'demo-s-7', name: 'Implant Dentar',           description: 'Vendosje implanti titaniumi', price: 45000, duration: 120, category: 'Kirurgji', isActive: true },
]

export const DEMO_PATIENTS: Patient[] = [
  { id: 'demo-p-1',  firstName: 'Test', lastName: '1',  email: 'test1@example.com',  phone: '+383 44 201 001', dateOfBirth: isoAt(29), gender: 'F', address: 'Rr. Nëna Terezë 12, Prishtinë', medicalHistory: [], allergies: [], createdAt: isoAt(1), lastVisit: iso(-6),  status: 'aktiv', visitStatus: 'returning' },
  { id: 'demo-p-2',  firstName: 'Test', lastName: '2',  email: 'test2@example.com',  phone: '+383 44 201 002', dateOfBirth: isoAt(41), gender: 'M', address: 'Rr. UÇK 45, Prishtinë',       medicalHistory: ['Presion i lartë gjaku'], allergies: ['Penicilinë'], createdAt: isoAt(2), lastVisit: iso(-14), status: 'aktiv', visitStatus: 'returning' },
  { id: 'demo-p-3',  firstName: 'Test', lastName: '3',  email: 'test3@example.com',  phone: '+383 44 201 003', dateOfBirth: isoAt(23), gender: 'F', address: 'Rr. Agim Ramadani 8, Prishtinë', medicalHistory: [], allergies: [], createdAt: iso(-3), status: 'aktiv', visitStatus: 'new' },
  { id: 'demo-p-4',  firstName: 'Test', lastName: '4',  email: 'test4@example.com',  phone: '+383 44 201 004', dateOfBirth: isoAt(35), gender: 'M', address: 'Rr. Bill Klinton 3, Prishtinë', medicalHistory: [], allergies: [], createdAt: isoAt(1), lastVisit: iso(-30), status: 'aktiv', visitStatus: 'returning' },
  { id: 'demo-p-5',  firstName: 'Test', lastName: '5',  email: 'test5@example.com',  phone: '+383 44 201 005', dateOfBirth: isoAt(58), gender: 'F', address: 'Rr. Luan Haradinaj 21, Prishtinë', medicalHistory: ['Diabet tip 2'], allergies: [], createdAt: isoAt(3), lastVisit: iso(-2), status: 'aktiv', visitStatus: 'returning' },
  { id: 'demo-p-6',  firstName: 'Test', lastName: '6',  email: 'test6@example.com',  phone: '+383 44 201 006', dateOfBirth: isoAt(8),  gender: 'M', address: 'Rr. Zenel Salihu 5, Prishtinë', medicalHistory: [], allergies: [], createdAt: iso(-1), status: 'aktiv', visitStatus: 'new' },
  { id: 'demo-p-7',  firstName: 'Test', lastName: '7',  email: 'test7@example.com',  phone: '+383 44 201 007', dateOfBirth: isoAt(27), gender: 'F', address: 'Rr. Fehmi Agani 17, Prishtinë', medicalHistory: [], allergies: ['Latex'], createdAt: isoAt(2), lastVisit: iso(-45), status: 'aktiv', visitStatus: 'returning' },
  { id: 'demo-p-8',  firstName: 'Test', lastName: '8',  email: 'test8@example.com',  phone: '+383 44 201 008', dateOfBirth: isoAt(50), gender: 'M', address: 'Rr. Ilir Konushevci 9, Prishtinë', medicalHistory: [], allergies: [], createdAt: isoAt(4), lastVisit: iso(-90), status: 'joaktiv', visitStatus: 'returning' },
  { id: 'demo-p-9',  firstName: 'Test', lastName: '9',  email: 'test9@example.com',  phone: '+383 44 201 009', dateOfBirth: isoAt(33), gender: 'F', address: 'Rr. Adem Jashari 14, Prishtinë', medicalHistory: [], allergies: [], createdAt: isoAt(1), lastVisit: iso(-8), status: 'aktiv', visitStatus: 'returning' },
  { id: 'demo-p-10', firstName: 'Test', lastName: '10', email: 'test10@example.com', phone: '+383 44 201 010', dateOfBirth: isoAt(19), gender: 'M', address: 'Rr. Garibaldi 2, Prishtinë', medicalHistory: [], allergies: [], createdAt: iso(-5), status: 'aktiv', visitStatus: 'new' },
]

function patientName(id: string) {
  const p = DEMO_PATIENTS.find((p) => p.id === id)
  return p ? `${p.firstName} ${p.lastName}` : 'Pacient'
}

export const DEMO_APPOINTMENTS: Appointment[] = [
  { id: 'demo-a-1', patientId: 'demo-p-1', patientName: patientName('demo-p-1'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, date: iso(0),  time: '09:00', duration: 30, type: 'Kontroll i Përgjithshëm', serviceId: 'demo-s-1', status: 'planifikuar' },
  { id: 'demo-a-2', patientId: 'demo-p-3', patientName: patientName('demo-p-3'), doctorId: DOCTOR2.id, doctorName: DOCTOR2.name, date: iso(0),  time: '10:00', duration: 90, type: 'Trajtim Kanalar', serviceId: 'demo-s-6', status: 'ne_pritje' },
  { id: 'demo-a-3', patientId: 'demo-p-5', patientName: patientName('demo-p-5'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, date: iso(0),  time: '13:00', duration: 45, type: 'Pastrim Dhëmbësh', serviceId: 'demo-s-2', status: 'planifikuar' },
  { id: 'demo-a-4', patientId: 'demo-p-6', patientName: patientName('demo-p-6'), doctorId: DOCTOR2.id, doctorName: DOCTOR2.name, date: iso(1),  time: '11:00', duration: 30, type: 'Konsultë Ortodontike', serviceId: 'demo-s-5', status: 'planifikuar' },
  { id: 'demo-a-5', patientId: 'demo-p-9', patientName: patientName('demo-p-9'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, date: iso(1),  time: '15:30', duration: 40, type: 'Mbushje Dentare', serviceId: 'demo-s-4', status: 'planifikuar' },
  { id: 'demo-a-6', patientId: 'demo-p-10',patientName: patientName('demo-p-10'),doctorId: DOCTOR2.id, doctorName: DOCTOR2.name, date: iso(2),  time: '09:30', duration: 120, type: 'Implant Dentar', serviceId: 'demo-s-7', status: 'planifikuar' },
  { id: 'demo-a-7', patientId: 'demo-p-2', patientName: patientName('demo-p-2'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, date: iso(-6), time: '10:00', duration: 45, type: 'Pastrim Dhëmbësh', serviceId: 'demo-s-2', status: 'perfunduar' },
  { id: 'demo-a-8', patientId: 'demo-p-4', patientName: patientName('demo-p-4'), doctorId: DOCTOR2.id, doctorName: DOCTOR2.name, date: iso(-14),time: '14:00', duration: 60, type: 'Zbardhim Dhëmbësh', serviceId: 'demo-s-3', status: 'perfunduar' },
  { id: 'demo-a-9', patientId: 'demo-p-7', patientName: patientName('demo-p-7'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, date: iso(-45),time: '09:00', duration: 30, type: 'Kontroll i Përgjithshëm', serviceId: 'demo-s-1', status: 'mungoi' },
  { id: 'demo-a-10',patientId: 'demo-p-1', patientName: patientName('demo-p-1'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, date: iso(-2), time: '16:00', duration: 30, type: 'Kontroll i Përgjithshëm', serviceId: 'demo-s-1', status: 'anuluar' },
]

export const DEMO_TREATMENTS: Treatment[] = [
  { id: 'demo-t-1', patientId: 'demo-p-2', doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, patientName: patientName('demo-p-2'), appointmentId: 'demo-a-7', type: 'Pastrim Dhëmbësh', description: 'Pastrim profesional dhe poliim, gjendje shumë e mirë', cost: 4000, date: iso(-6), status: 'perfunduar' },
  { id: 'demo-t-2', patientId: 'demo-p-4', doctorId: DOCTOR2.id, doctorName: DOCTOR2.name, patientName: patientName('demo-p-4'), appointmentId: 'demo-a-8', type: 'Zbardhim Dhëmbësh', description: 'Zbardhim në 2 seanca, rezultat i mirë', cost: 12000, date: iso(-14), status: 'perfunduar' },
  { id: 'demo-t-3', patientId: 'demo-p-5', doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, patientName: patientName('demo-p-5'), type: 'Mbushje Dentare', description: 'Mbushje kompozite, dhëmbi 26', cost: 5000, date: iso(-30), status: 'perfunduar' },
  { id: 'demo-t-4', patientId: 'demo-p-9', doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, patientName: patientName('demo-p-9'), type: 'Trajtim Kanalar', description: 'Kanal rrënjor, dhëmbi 36 — në vazhdim', cost: 15000, date: iso(-8), status: 'ne_proces' },
]

export const DEMO_PRESCRIPTIONS: Prescription[] = [
  { id: 'demo-rx-1', patientId: 'demo-p-2', patientName: patientName('demo-p-2'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, medication: 'Amoksicilinë 500mg', dosage: '1 kapsulë', frequency: '3x në ditë', duration: '7 ditë', instructions: 'Merret pas ushqimit', issuedDate: iso(-6) },
  { id: 'demo-rx-2', patientId: 'demo-p-9', patientName: patientName('demo-p-9'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, medication: 'Ibuprofen 400mg', dosage: '1 tabletë', frequency: '2x në ditë', duration: '5 ditë', instructions: 'Në rast dhimbjeje', issuedDate: iso(-8) },
]

function makePayments(invoiceId: string, paid: number) {
  return paid > 0 ? [{ id: `${invoiceId}-pay-1`, invoiceId, amount: paid, method: 'karte' as const, date: iso(-3) }] : []
}

export const DEMO_INVOICES: Invoice[] = [
  { id: 'demo-inv-1', patientId: 'demo-p-2', patientName: patientName('demo-p-2'), treatments: ['demo-t-1'], totalAmount: 4000,  paidAmount: 4000, remainingAmount: 0,    status: 'paguar',     createdAt: iso(-6),  dueDate: iso(0),  payments: makePayments('demo-inv-1', 4000) },
  { id: 'demo-inv-2', patientId: 'demo-p-4', patientName: patientName('demo-p-4'), treatments: ['demo-t-2'], totalAmount: 12000, paidAmount: 6000, remainingAmount: 6000, status: 'pjeserisht', createdAt: iso(-14), dueDate: iso(7),  payments: makePayments('demo-inv-2', 6000) },
  { id: 'demo-inv-3', patientId: 'demo-p-5', patientName: patientName('demo-p-5'), treatments: ['demo-t-3'], totalAmount: 5000,  paidAmount: 5000, remainingAmount: 0,    status: 'paguar',     createdAt: iso(-30), dueDate: iso(-23), payments: makePayments('demo-inv-3', 5000) },
  { id: 'demo-inv-4', patientId: 'demo-p-9', patientName: patientName('demo-p-9'), treatments: ['demo-t-4'], totalAmount: 15000, paidAmount: 0,    remainingAmount: 15000,status: 'papaguar',   createdAt: iso(-8),  dueDate: iso(6),  payments: [] },
]

export interface DemoInventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  reorderLevel: number
  expiryDate: string | null
  expiryStatus: 'ok' | 'expiring_soon' | 'expired'
}

export const DEMO_INVENTORY: DemoInventoryItem[] = [
  { id: 'demo-inv-item-1', name: 'Doreza Nitril (M)',       category: 'Mbrojtje',  quantity: 480, unit: 'copë',  reorderLevel: 100, expiryDate: null,       expiryStatus: 'ok' },
  { id: 'demo-inv-item-2', name: 'Anestezi Lokale (Lidokainë)', category: 'Farmaceutikë', quantity: 22, unit: 'fiolë', reorderLevel: 15, expiryDate: iso(120), expiryStatus: 'ok' },
  { id: 'demo-inv-item-3', name: 'Kompozit Dentar A2',      category: 'Materiale', quantity: 8,  unit: 'shiringë', reorderLevel: 10, expiryDate: iso(20),  expiryStatus: 'expiring_soon' },
  { id: 'demo-inv-item-4', name: 'Fija Kirurgjikale',       category: 'Kirurgji',  quantity: 35, unit: 'copë',  reorderLevel: 20,  expiryDate: iso(200), expiryStatus: 'ok' },
  { id: 'demo-inv-item-5', name: 'Maska Kirurgjikale',      category: 'Mbrojtje',  quantity: 150,unit: 'copë',  reorderLevel: 50,  expiryDate: null,     expiryStatus: 'ok' },
  { id: 'demo-inv-item-6', name: 'Gel Zbardhues',           category: 'Estetikë',  quantity: 4,  unit: 'shiringë', reorderLevel: 5, expiryDate: iso(-4), expiryStatus: 'expired' },
]

// Full timestamps (not just a date) for the queue/waitlist's own
// checked-in/called/notified fields — offset in minutes from right now, so
// "checked in 12 minutes ago" always looks current no matter when the demo
// is actually run, same idea as iso()/isoAt() above but finer-grained.
const isoMinutesAgo = (minutes: number) => new Date(today.getTime() - minutes * 60_000).toISOString()

export const DEMO_QUEUE: QueueEntry[] = [
  { id: 'demo-q-1', patientId: 'demo-p-6',  patientName: patientName('demo-p-6'),  patientPhone: '+383 44 201 006', doctorId: DOCTOR2.id, doctorName: DOCTOR2.name, status: 'thirrur',     priority: false, checkedInAt: isoMinutesAgo(18), calledAt: isoMinutesAgo(2) },
  { id: 'demo-q-2', patientId: 'demo-p-10', patientName: patientName('demo-p-10'), patientPhone: '+383 44 201 010', status: 'duke_pritur', priority: false, checkedInAt: isoMinutesAgo(9) },
  { id: 'demo-q-3', patientId: 'demo-p-3',  patientName: patientName('demo-p-3'),  patientPhone: '+383 44 201 003', status: 'duke_pritur', priority: true,  notes: 'Dhimbje akute', checkedInAt: isoMinutesAgo(4) },
]

export const DEMO_WAITLIST: WaitlistEntry[] = [
  { id: 'demo-w-1', patientId: 'demo-p-7', patientName: patientName('demo-p-7'), doctorId: DOCTOR1.id, doctorName: DOCTOR1.name, preferredDate: iso(2), notes: 'Preferon paradite', status: 'aktiv',     createdAt: iso(-1) },
  { id: 'demo-w-2', patientId: 'demo-p-8', patientName: patientName('demo-p-8'), doctorId: DOCTOR2.id, doctorName: DOCTOR2.name, preferredDate: iso(1), status: 'njoftuar', createdAt: iso(-2), notifiedAt: isoMinutesAgo(90) },
]

export const DEMO_SERVICE_PACKAGES: ServicePackage[] = [
  { id: 'demo-pkg-1', name: 'Paketë Zbardhimi Plus', description: '3 seanca zbardhimi profesional', serviceId: 'demo-s-3', serviceName: 'Zbardhim Dhëmbësh', sessionCount: 3, price: 30000, validityDays: 180, isActive: true, sortOrder: 0 },
  { id: 'demo-pkg-2', name: 'Paketë Pastrimi Vjetor', description: '4 pastrime profesionale gjatë vitit', serviceId: 'demo-s-2', serviceName: 'Pastrim Dhëmbësh', sessionCount: 4, price: 14000, validityDays: 365, isActive: true, sortOrder: 1 },
]

export const DEMO_PACKAGE_PURCHASES: PackagePurchase[] = [
  { id: 'demo-pp-1', patientId: 'demo-p-2', packageId: 'demo-pkg-1', packageName: 'Paketë Zbardhimi Plus', serviceId: 'demo-s-3', serviceName: 'Zbardhim Dhëmbësh', sessionsTotal: 3, sessionsUsed: 1, pricePaid: 30000, purchasedAt: iso(-20), expiresAt: iso(160), status: 'active' },
  { id: 'demo-pp-2', patientId: 'demo-p-5', packageId: 'demo-pkg-2', packageName: 'Paketë Pastrimi Vjetor', serviceId: 'demo-s-2', serviceName: 'Pastrim Dhëmbësh', sessionsTotal: 4, sessionsUsed: 4, pricePaid: 14000, purchasedAt: iso(-200), expiresAt: iso(165), status: 'completed' },
]

export function buildDashboardStats() {
  const totalPatients = DEMO_PATIENTS.length
  const totalAppointmentsToday = DEMO_APPOINTMENTS.filter((a) => a.date === iso(0)).length
  const totalRevenue = DEMO_INVOICES.reduce((sum, i) => sum + i.paidAmount, 0)
  const pendingPayments = DEMO_INVOICES.reduce((sum, i) => sum + i.remainingAmount, 0)
  const completedTreatments = DEMO_TREATMENTS.filter((t) => t.status === 'perfunduar').length

  const monthNames = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gsh', 'Sht', 'Tet', 'Nën', 'Dhj']
  const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(today)
    d.setMonth(d.getMonth() - (5 - i))
    return { month: monthNames[d.getMonth()], revenue: 180000 + i * 22000 + (i % 2 === 0 ? 8000 : -4000) }
  })

  const appointmentsByStatus = ['planifikuar', 'ne_pritje', 'perfunduar', 'anuluar', 'mungoi'].map((status) => ({
    status,
    count: DEMO_APPOINTMENTS.filter((a) => a.status === status).length,
  }))

  const todayAppointments = DEMO_APPOINTMENTS.filter((a) => a.date === iso(0)).map((a) => ({
    id: a.id, patientName: a.patientName, doctorName: a.doctorName, time: a.time, type: a.type, status: a.status,
  }))

  return {
    stats: { totalPatients, totalAppointmentsToday, totalRevenue, pendingPayments, totalAppointments: DEMO_APPOINTMENTS.length, completedTreatments },
    monthlyRevenue,
    appointmentsByStatus,
    todayAppointments,
  }
}

export const DEMO_CLINIC_SETTINGS = {
  logo_url: null as string | null,
  favicon_url: null as string | null,
  sidebar_icon_url: null as string | null,
  chatbot_icon_url: null as string | null,
  theme_preset: 'blue',
  custom_theme_color: null as string | null,
  theme_surface: 'glass',
  theme_font: 'default',
  custom_font_url: null as string | null,
  custom_font_name: null as string | null,
  clinic_open_time: '08:00',
  clinic_close_time: '18:00',
  commission_basis: 'cost' as const,
  // Critical: without this, the first-login setup wizard would pop up mid
  // sales demo — see context/setup-wizard-context.tsx's auto-launch check.
  setup_wizard_done: true,
}
