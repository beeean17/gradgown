/**
 * Canonical client URLs. Feature code imports these rather than scattering
 * literals, while `legacy` keeps durable links from the Flutter app working.
 *
 * The site root is the landing deck and it serves as the main page for signed-in
 * and signed-out visitors alike.
 */
export const PATHS = {
  /**
   * The one home. The landing deck doubles as the main page for everyone —
   * there is no separate signed-in hub, so nothing should reintroduce a second
   * "home" URL.
   */
  home: '/',
  auth: {
    login: '/login',
  },
  public: {
    reservation: '/reservation',
    /**
     * The mobile dock's 예약 tab: what to know before reserving and the way
     * into the flow. The flow itself stays immersive at `reservation`.
     */
    reservationGuide: '/reservation/guide',
    /**
     * St:talk's public guide (the dock's St:talk tab): programme, schedule,
     * mentor list, and the way into the flow. Readable before sign-in.
     */
    mentoring: '/mentoring',
    /** The immersive St:talk apply flow, outside the shell like `reservation`. */
    mentoringApply: '/mentoring/apply',
    lectures: '/lectures',
    lecture: (id: string) => `/lectures/${id}`,
    lectureRegister: (id: string) => `/lectures/${id}/register`,
    announcements: '/announcements',
    announcement: (id: string) => `/announcements/${id}`,
  },
  /**
   * Email-only account destinations. `/me` is an inbound alias for
   * reservations on desktop; on mobile all three show the one 내 신청 panel.
   */
  me: {
    home: '/me',
    reservations: '/me/reservations',
    mentoring: '/me/mentoring',
    lectures: '/me/lectures',
  },
} as const

/** Old Flutter / early-web URLs deliberately remain redirects, never canonicals. */
export const LEGACY_PATHS = {
  profile: '/profile',
  status: '/status',
  reservations: '/reservations/me',
  myStatus: '/my-status',
  myReservations: '/my-reservations',
  reservationCreate: '/reservation/create',
  /** Retired: the signed-in hub was folded into the landing at `/`. */
  home: '/home',
} as const
