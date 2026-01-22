import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Custom hook to warn users about unsaved changes when navigating away.
 * Works with BrowserRouter (doesn't require data router).
 *
 * Handles:
 * - Browser back/forward buttons
 * - Link clicks within the app
 * - Browser close/refresh
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigate = useNavigate()
  const location = useLocation()

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handlePopState = (_e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
        if (!confirmed) {
          // Push current state back to prevent navigation
          window.history.pushState(null, '', location.pathname + location.search)
        }
      }
    }

    // Push current state to enable popstate detection
    window.history.pushState(null, '', location.pathname + location.search)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasUnsavedChanges, location.pathname, location.search])

  // Handle link clicks - intercept clicks on anchor tags
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor && anchor.href) {
        const url = new URL(anchor.href)
        // Only intercept internal navigation (same origin)
        if (url.origin === window.location.origin) {
          const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
          if (!confirmed) {
            e.preventDefault()
            e.stopPropagation()
          }
        }
      }
    }

    // Use capture phase to intercept before React Router handles it
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [hasUnsavedChanges])

  // Wrapped navigate function that confirms before navigating
  const safeNavigate = useCallback((to: string | number, options?: { replace?: boolean }) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) return
    }
    if (typeof to === 'number') {
      navigate(to)
    } else {
      navigate(to, options)
    }
  }, [hasUnsavedChanges, navigate])

  return { safeNavigate }
}
