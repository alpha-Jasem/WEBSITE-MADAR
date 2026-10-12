import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'

/*
 * Small pub/sub between the pages and the shell's top bar, so the top bar can
 * hold one page-level primary action (like "حجز جديد" on Bookings) without the
 * layout knowing each page's state, and so top-bar buttons can open panels
 * (support chat, shortcuts) that live elsewhere in the tree.
 */

export interface ShellPrimaryAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
}

let current: { token: symbol; action: ShellPrimaryAction } | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** The action the current page put in the top bar, if any. */
export function useShellPrimary(): ShellPrimaryAction | null {
  return useSyncExternalStore(subscribe, () => current?.action ?? null, () => null)
}

/**
 * Puts one primary button in the top bar while the calling page is mounted.
 * Pass null to show none. The click handler always runs the latest closure.
 */
export function useShellPrimaryAction(action: ShellPrimaryAction | null) {
  const ref = useRef(action)
  ref.current = action
  const tokenRef = useRef<symbol>(Symbol('shell-primary'))
  const key = action ? `${action.label}\u0000${action.disabled ? 1 : 0}` : ''

  useEffect(() => {
    const token = tokenRef.current
    const a = ref.current
    current = a
      ? { token, action: { label: a.label, icon: a.icon, disabled: a.disabled, onClick: () => ref.current?.onClick() } }
      : null
    emit()
    // Only clear if nothing newer replaced us: during route transitions the next
    // page mounts before the previous one finishes its exit animation.
    return () => {
      if (current?.token === token) { current = null; emit() }
    }
  }, [key])
}

const SUPPORT_OPEN_EVENT = 'dv2:open-support'
export function requestOpenSupport() { window.dispatchEvent(new Event(SUPPORT_OPEN_EVENT)) }
export function useOnOpenSupportRequest(handler: () => void) {
  useEffect(() => {
    window.addEventListener(SUPPORT_OPEN_EVENT, handler)
    return () => window.removeEventListener(SUPPORT_OPEN_EVENT, handler)
  }, [handler])
}

const SHORTCUTS_OPEN_EVENT = 'dv2:open-shortcuts' // ShortcutsOverlay (uiExtras) listens for this name
export function requestOpenShortcuts() { window.dispatchEvent(new Event(SHORTCUTS_OPEN_EVENT)) }
