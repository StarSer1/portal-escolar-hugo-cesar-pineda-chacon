import { useEffect, useState } from 'react'
import { doc, onSnapshot, runTransaction } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { currentActor, writeAudited } from '@/features/academic/services/academic.service'
import { errorMessage } from '@/shared/errors'
import { cleanSchedules, defaultSchedules, type SpecialistSchedules } from './specialistSchedule'

/** Documento editable: documentTemplates/specialistSchedules (solo dirección). */
const ref = () => doc(db, 'documentTemplates', 'specialistSchedules')

export interface LiveSchedules { schedules: SpecialistSchedules; revision: number; saved: boolean; ready: boolean; error: string }

export function useSpecialistSchedules(): LiveSchedules {
  const [state, setState] = useState<LiveSchedules>({ schedules: defaultSchedules, revision: 0, saved: false, ready: false, error: '' })
  useEffect(() => onSnapshot(ref(), (snapshot) => {
    const data = snapshot.data()
    setState({ schedules: data ? cleanSchedules(data) : defaultSchedules, revision: Number(data?.revision ?? 0), saved: snapshot.exists(), ready: true, error: '' })
  }, (caught) => setState((current) => ({ ...current, ready: false, error: errorMessage(caught) }))), [])
  return state
}

/** Guarda el horario completo; falla si otra persona guardó mientras se editaba. */
export async function saveSpecialistSchedules(value: SpecialistSchedules, expectedRevision: number) {
  const actorId = currentActor()
  const clean = cleanSchedules(value)
  await runTransaction(db, async (transaction) => {
    const previous = (await transaction.get(ref())).data()
    if (Number(previous?.revision ?? 0) !== expectedRevision) {
      throw new Error('Otra persona guardó el horario mientras lo editabas. Descarta tus cambios para ver la versión actual y vuelve a aplicarlos.')
    }
    writeAudited(transaction, 'documentTemplates', ref(), { ...clean }, previous, actorId, 'update-document')
  })
}
