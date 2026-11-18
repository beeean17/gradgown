/**
 * One step of an immersive flow, in one place per flow. The title bar's rail
 * and each step heading both read from the flow's list, so a step can never
 * be labelled one thing in the rail and another in the title.
 */
export interface FlowStep {
  key: string
  /** Short label for the title bar's step rail. */
  nav: string
  /** What to do right now, not what this screen is called. */
  title: string
  /** Optional caveat shown under the rail. Omitted where the title says it all. */
  subtitle?: string
}
