// Declarative per-entity config for the generic import engine — this is the
// one file that has to grow when the backend registers a new importer
// (services/import/<entity>.js on the API side). ImportoSection itself never
// branches on entity by name; it just renders whatever's in here. Keeping
// field guides/samples as plain data (not translated per-locale, same as the
// sample CSVs always were) matches this section's existing convention: the
// app's chrome (buttons, table captions) is bilingual via next-intl, but the
// actual column names/aliases/examples shown here are Albanian-first,
// exactly like the spreadsheets clinics actually import.
import type { ReactNode } from "react"
import { Users, CalendarClock, UserCog, Wallet, Boxes } from "lucide-react"
import type {
  ImportEntity,
  PatientImportRow, AppointmentImportRow, StaffImportRow, ServiceImportRow, InventoryImportRow,
} from "@core/lib/api/data-import"

export interface ImportFieldGuide {
  label: string
  required: boolean
  aliases: string
  example: string
}

export interface ImportPreviewColumn<Row> {
  headerKey: string // resolved via t() in the component — see messages/*/importo-section.json's "table" block
  cell: (row: Row) => ReactNode
}

export interface ImportEntityConfig<Row = any> {
  key: ImportEntity
  icon: typeof Users
  entityLabelKey: string
  uploadTitleKey: string
  uploadDescriptionKey: string
  guideIntro: string
  fields: ImportFieldGuide[]
  sampleHeaders: string[]
  sampleRows: string[][]
  sampleFilename: string
  previewColumns: ImportPreviewColumn<Row>[]
}

const ROLE_LABELS: Record<string, string> = { admin: "Admin", mjek: "Mjek", recepsion: "Recepsion" }

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.join(",")).join("\n")
}

const patientsFields: ImportFieldGuide[] = [
  { label: "Emri", required: true, aliases: "Emri, First Name", example: "Ada" },
  { label: "Mbiemri", required: true, aliases: "Mbiemri, Last Name", example: "Berisha" },
  { label: "Telefoni", required: true, aliases: "Telefoni, Phone, Tel", example: "069123456" },
  { label: "Email", required: false, aliases: "Email, E-mail", example: "ada@shembull.com" },
  { label: "Datëlindja", required: false, aliases: "Datelindja, Date of Birth, DOB", example: "1990-05-12" },
  { label: "Gjinia", required: false, aliases: "Gjinia, Gender, Sex (M/F)", example: "F" },
  { label: "Adresa", required: false, aliases: "Adresa, Address", example: "Tiranë" },
  { label: "Gjaku", required: false, aliases: "Gjaku, Blood Type", example: "A+" },
]
const patientsSampleHeaders = ["Emri", "Mbiemri", "Telefoni", "Email", "Datelindja", "Gjinia", "Adresa", "Gjaku"]
const patientsSampleRows = [
  ["Ada", "Berisha", "069123456", "ada@shembull.com", "1990-05-12", "Femer", "Tirane", "A+"],
  ["Besnik", "Krasniqi", "067987654", "", "1985-03-15", "Mashkull", "Prishtine", ""],
]

const appointmentsFields: ImportFieldGuide[] = [
  { label: "Telefoni i Pacientit", required: true, aliases: "Telefoni, Patient Phone (ose Emri+Mbiemri)", example: "069123456" },
  { label: "Data", required: true, aliases: "Data, Date — YYYY-MM-DD ose DD/MM/YYYY", example: "2026-09-01" },
  { label: "Ora", required: true, aliases: "Ora, Time — HH:MM", example: "10:00" },
  { label: "Lloji / Shërbimi", required: true, aliases: "Lloji, Service, Type", example: "Kontroll i Përgjithshëm" },
  { label: "Mjeku", required: false, aliases: "Mjeku, Doctor, Doctor Email — përputhet nëse ekziston, përndryshe importohet pa mjek", example: "Dr. Elira Hoxha" },
  { label: "Kohëzgjatja", required: false, aliases: "Kohezgjatja, Duration, Minutes — parazgjedhje 30", example: "30" },
  { label: "Statusi", required: false, aliases: "Statusi, Status — parazgjedhje sipas datës", example: "Planifikuar" },
  { label: "Shënime", required: false, aliases: "Shenime, Notes, Comments", example: "" },
]
const appointmentsSampleHeaders = ["Telefoni", "Data", "Ora", "Mjeku", "Lloji", "Kohezgjatja", "Statusi", "Shenime"]
const appointmentsSampleRows = [
  ["069123456", "2026-09-01", "10:00", "Dr. Elira Hoxha", "Kontroll i Përgjithshëm", "30", "Përfunduar", ""],
  ["067987654", "2026-09-20", "14:30", "Dr. Genti Leka", "Kontroll Vjetor", "45", "Planifikuar", "Pacienti kërkoi orar pasdite"],
]

const staffFields: ImportFieldGuide[] = [
  { label: "Emri", required: true, aliases: "Emri, Name, Full Name", example: "Elira Hoxha" },
  { label: "Email", required: false, aliases: "Email — pa email, llogaria krijohet pa hyrje deri sa t'i vendoset një", example: "elira@klinika.com" },
  { label: "Telefoni", required: false, aliases: "Telefoni, Phone", example: "069123456" },
  { label: "Roli", required: false, aliases: "Roli, Role — Admin / Mjek / Recepsion, parazgjedhje Recepsion", example: "Mjek" },
  { label: "Specializimi", required: false, aliases: "Specializimi, Specialization", example: "Mjekësi e Përgjithshme" },
  { label: "Data e Punësimit", required: false, aliases: "Data e Punesimit, Hire Date, Start Date — parazgjedhje sot", example: "2024-03-01" },
]
const staffSampleHeaders = ["Emri", "Email", "Telefoni", "Roli", "Specializimi", "Data e Punesimit"]
const staffSampleRows = [
  ["Elira Hoxha", "elira@klinika.com", "069111222", "Mjek", "Mjekësi e Përgjithshme", "2024-03-01"],
  ["Blerina Krasniqi", "", "069333444", "Recepsion", "", ""],
]

const servicesFields: ImportFieldGuide[] = [
  { label: "Emri", required: true, aliases: "Emri, Name, Service", example: "Konsultë Fillestare" },
  { label: "Çmimi", required: true, aliases: "Cmimi, Price, Cost", example: "25.50" },
  { label: "Kohëzgjatja", required: false, aliases: "Kohezgjatja, Duration, Minutes — parazgjedhje 30", example: "30" },
  { label: "Kategoria", required: false, aliases: "Kategoria, Category", example: "Konsultë" },
  { label: "Përshkrimi", required: false, aliases: "Pershkrimi, Description", example: "" },
  { label: "Aktiv", required: false, aliases: "Aktiv, Active, Status — parazgjedhje Po", example: "Po" },
]
const servicesSampleHeaders = ["Emri", "Cmimi", "Kohezgjatja", "Kategoria", "Pershkrimi", "Aktiv"]
const servicesSampleRows = [
  ["Konsultë Fillestare", "25.50", "30", "Konsultë", "Ekzaminim dhe vlerësim fillestar", "Po"],
  ["Konsultë e Përgjithshme", "15", "20", "Kontrolle", "", "Po"],
]

const inventoryFields: ImportFieldGuide[] = [
  { label: "Emri", required: true, aliases: "Emri, Name, Item", example: "Doreza Nitril" },
  { label: "Sasia", required: false, aliases: "Sasia, Quantity, Qty — parazgjedhje 0", example: "100" },
  { label: "Njësia", required: false, aliases: "Njesia, Unit — parazgjedhje copë", example: "kuti" },
  { label: "Kategoria", required: false, aliases: "Kategoria, Category", example: "Konsumabla" },
  { label: "Pragu i Rimbushjes", required: false, aliases: "Pragu i Rimbushjes, Reorder Threshold — parazgjedhje 5", example: "10" },
  { label: "Data e Skadencës", required: false, aliases: "Data e Skadences, Expiry Date", example: "2027-01-01" },
  { label: "Numri i Lotit", required: false, aliases: "Numri i Lotit, Lot Number, Lot", example: "LOT-2026-01" },
]
const inventorySampleHeaders = ["Emri", "Sasia", "Njesia", "Kategoria", "Pragu i Rimbushjes", "Data e Skadences", "Numri i Lotit"]
const inventorySampleRows = [
  ["Doreza Nitril", "100", "kuti", "Konsumabla", "10", "2027-01-01", "LOT-2026-01"],
  ["Maska Kirurgjikale", "50", "pako", "Konsumabla", "5", "", ""],
]

export const IMPORT_ENTITIES: ImportEntityConfig<any>[] = [
  {
    key: "patients",
    icon: Users,
    entityLabelKey: "entity.patients",
    uploadTitleKey: "patients.uploadTitle",
    uploadDescriptionKey: "patients.uploadDescription",
    guideIntro: "Shtoni historikun ekzistues të pacientëve nga një eksport i klinikës suaj të mëparshme.",
    fields: patientsFields,
    sampleHeaders: patientsSampleHeaders,
    sampleRows: patientsSampleRows,
    sampleFilename: "shembull-pacientet.csv",
    previewColumns: [
      { headerKey: "table.name", cell: (row: PatientImportRow) => `${row.data.firstName} ${row.data.lastName}` },
      { headerKey: "table.phone", cell: (row: PatientImportRow) => row.data.phone },
      { headerKey: "table.email", cell: (row: PatientImportRow) => row.data.email || "—" },
    ],
  },
  {
    key: "appointments",
    icon: CalendarClock,
    entityLabelKey: "entity.appointments",
    uploadTitleKey: "appointments.uploadTitle",
    uploadDescriptionKey: "appointments.uploadDescription",
    guideIntro: "Rikuperoni historikun e termineve — pacienti duhet të ekzistojë tashmë (importojeni fillimisht nëse mungon).",
    fields: appointmentsFields,
    sampleHeaders: appointmentsSampleHeaders,
    sampleRows: appointmentsSampleRows,
    sampleFilename: "shembull-terminet.csv",
    previewColumns: [
      { headerKey: "table.patient", cell: (row: AppointmentImportRow) => row.data.patientLabel || "—" },
      { headerKey: "table.doctor", cell: (row: AppointmentImportRow) => row.data.doctorLabel || "—" },
      { headerKey: "table.dateTime", cell: (row: AppointmentImportRow) => (row.data.date && row.data.time ? `${row.data.date} · ${row.data.time.slice(0, 5)}` : "—") },
      { headerKey: "table.type", cell: (row: AppointmentImportRow) => row.data.type || "—" },
    ],
  },
  {
    key: "staff",
    icon: UserCog,
    entityLabelKey: "entity.staff",
    uploadTitleKey: "staff.uploadTitle",
    uploadDescriptionKey: "staff.uploadDescription",
    guideIntro: "Shtoni ekipin ekzistues të klinikës — anëtarët e importuar marrin një fjalëkalim të përkohshëm dhe duhet ta rivendosin para se të hyjnë.",
    fields: staffFields,
    sampleHeaders: staffSampleHeaders,
    sampleRows: staffSampleRows,
    sampleFilename: "shembull-stafi.csv",
    previewColumns: [
      { headerKey: "table.name", cell: (row: StaffImportRow) => row.data.name },
      { headerKey: "table.role", cell: (row: StaffImportRow) => ROLE_LABELS[row.data.role] || row.data.role },
      { headerKey: "table.email", cell: (row: StaffImportRow) => row.data.email || "—" },
      { headerKey: "table.specialization", cell: (row: StaffImportRow) => row.data.specialization || "—" },
    ],
  },
  {
    key: "services",
    icon: Wallet,
    entityLabelKey: "entity.services",
    uploadTitleKey: "services.uploadTitle",
    uploadDescriptionKey: "services.uploadDescription",
    guideIntro: "Ngarkoni listën e çmimeve/shërbimeve nga një skedar ekzistues në vend që t'i shtoni një nga një.",
    fields: servicesFields,
    sampleHeaders: servicesSampleHeaders,
    sampleRows: servicesSampleRows,
    sampleFilename: "shembull-sherbimet.csv",
    previewColumns: [
      { headerKey: "table.name", cell: (row: ServiceImportRow) => row.data.name },
      { headerKey: "table.price", cell: (row: ServiceImportRow) => (row.data.price !== undefined ? `${row.data.price} €` : "—") },
      { headerKey: "table.duration", cell: (row: ServiceImportRow) => `${row.data.duration} min` },
      { headerKey: "table.category", cell: (row: ServiceImportRow) => row.data.category || "—" },
    ],
  },
  {
    key: "inventory",
    icon: Boxes,
    entityLabelKey: "entity.inventory",
    uploadTitleKey: "inventory.uploadTitle",
    uploadDescriptionKey: "inventory.uploadDescription",
    guideIntro: "Regjistroni stokun ekzistues (dorezat, maska, materiale) pa e futur artikull pas artikulli me dorë.",
    fields: inventoryFields,
    sampleHeaders: inventorySampleHeaders,
    sampleRows: inventorySampleRows,
    sampleFilename: "shembull-inventari.csv",
    previewColumns: [
      { headerKey: "table.name", cell: (row: InventoryImportRow) => row.data.name },
      { headerKey: "table.quantity", cell: (row: InventoryImportRow) => `${row.data.quantity} ${row.data.unit}` },
      { headerKey: "table.category", cell: (row: InventoryImportRow) => row.data.category || "—" },
      { headerKey: "table.expiry", cell: (row: InventoryImportRow) => row.data.expiryDate || "—" },
    ],
  },
]

export function sampleCsvFor(config: ImportEntityConfig): string {
  return toCsv(config.sampleHeaders, config.sampleRows)
}

export function configFor(entity: ImportEntity): ImportEntityConfig {
  const found = IMPORT_ENTITIES.find((e) => e.key === entity)
  if (!found) throw new Error(`Unknown import entity: ${entity}`)
  return found
}
