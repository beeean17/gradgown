import { Outlet } from 'react-router-dom'

/**
 * The ground under the immersive flows (reservation, St:talk apply), which sit
 * outside PublicLayout. FlowShell paints the body colour once the screen
 * renders; this paints it first, so the sign-in check and the lazy chunk's
 * spinner do not flash on the lighter page canvas.
 */
export function FlowLayout() {
  return (
    <div className="bg-body min-h-[100dvh]">
      <Outlet />
    </div>
  )
}
