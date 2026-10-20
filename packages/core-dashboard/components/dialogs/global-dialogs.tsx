"use client"

import { useAuth } from '@core/context/auth-context'
import { useQuickActions } from '@core/context/quick-actions-context'
import { AddPatientDialog } from './add-patient-dialog'
import { AddAppointmentDialog } from './add-appointment-dialog'
import { AddStaffDialog } from './add-staff-dialog'
import { AddServiceDialog } from './add-service-dialog'
import { AddPrescriptionDialog } from './add-prescription-dialog'

export function GlobalDialogs() {
  const { user } = useAuth()
  const { activeDialog, closeDialog } = useQuickActions()

  return (
    <>
      <AddPatientDialog open={activeDialog === 'pacient'} onClose={closeDialog} />
      <AddAppointmentDialog open={activeDialog === 'takim'} onClose={closeDialog} />
      {user?.role === 'admin' && (
        <>
          <AddStaffDialog open={activeDialog === 'staf'} onClose={closeDialog} />
          <AddServiceDialog open={activeDialog === 'sherbim'} onClose={closeDialog} />
        </>
      )}
      {user?.role === 'mjek' && (
        <AddPrescriptionDialog open={activeDialog === 'recete'} onClose={closeDialog} />
      )}
    </>
  )
}
