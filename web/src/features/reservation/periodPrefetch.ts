import { primeLive } from '../../shared/data/live'
import { fromRestFields } from '../../shared/data/restFields'
import { firebase } from '../../shared/firebase/runtime'
import { PERIOD_KEY, toPeriod } from './reservationData'

/**
 * The home screen's round (`settings/reservation`) before the Firestore
 * listener is up: the edge copy from `/api/schedule` (web/functions), which
 * index.html has been fetching alongside the app bundle, else the copy this
 * browser saved within the last day. Either only shows until the listener
 * answers — see primeLive.
 */
const SAVED_KEY = 'grad42:schedule'
const SAVED_FOR_MS = 24 * 60 * 60 * 1000

export function prefetchPeriod() {
  if (firebase().config.emulator) return
  const saved = readSaved()
  if (saved) primeLive(PERIOD_KEY, toPeriod(fromRestFields(saved)))
  fetch('/api/schedule')
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { fields?: unknown } | null) => {
      if (!body?.fields) return
      primeLive(PERIOD_KEY, toPeriod(fromRestFields(body.fields)))
      save(body.fields)
    })
    .catch(() => {
      // The listener still loads the round; this was only a head start.
    })
}

function readSaved(): unknown {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY)
    if (!raw) return null
    const { savedAt, fields } = JSON.parse(raw) as { savedAt?: number; fields?: unknown }
    return typeof savedAt === 'number' && Date.now() - savedAt < SAVED_FOR_MS ? fields : null
  } catch {
    return null
  }
}

function save(fields: unknown) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify({ savedAt: Date.now(), fields }))
  } catch {
    // Private mode or a full quota: the next visit simply waits for the edge copy.
  }
}
