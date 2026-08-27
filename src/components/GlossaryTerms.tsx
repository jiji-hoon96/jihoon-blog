'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react'

import type { GlossaryLocale } from '@/lib/glossary'
import {
  chooseGlossaryPresentation,
  glossaryUiReducer,
  placeGlossaryTooltip,
  type GlossaryInput,
  type GlossaryUiAction,
  type GlossaryUiState,
  type TooltipPlacement,
} from '@/lib/glossary-ui'

export type GlossaryTermsProps = {
  rootId: string
  entries: GlossaryLocale
  closeLabel: string
}

function containsTarget(element: Element | null, target: EventTarget | null) {
  return target instanceof Node && Boolean(element?.contains(target))
}

export default function GlossaryTerms({
  rootId,
  entries,
  closeLabel,
}: GlossaryTermsProps) {
  const [state, dispatch] = useReducer(
    glossaryUiReducer,
    { status: 'closed' } as GlossaryUiState,
  )
  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPlacement | null>(null)
  const generatedId = useId().replaceAll(':', '')
  const overlayId = `glossary-explanation-${generatedId}`
  const stateRef = useRef(state)
  const activeButtonRef = useRef<HTMLButtonElement | null>(null)
  const annotatedButtonRef = useRef<HTMLButtonElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastInputRef = useRef<GlossaryInput>('mouse')

  const send = useCallback((action: GlossaryUiAction) => {
    stateRef.current = glossaryUiReducer(stateRef.current, action)
    dispatch(action)
  }, [])

  const close = useCallback(() => send({ type: 'close' }), [send])

  useEffect(() => {
    const root = document.getElementById(rootId)
    if (!root) return

    const replacements: Array<{
      source: HTMLElement
      button: HTMLButtonElement
    }> = []
    const sources = root.querySelectorAll<HTMLElement>(
      '.glossary-term-source[data-glossary-key]',
    )

    for (const source of sources) {
      const key = source.dataset.glossaryKey
      if (!key || !entries[key]) {
        source.classList.remove('glossary-term-source')
        continue
      }

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'glossary-term'
      button.dataset.glossaryKey = key
      button.textContent = source.textContent
      source.replaceWith(button)
      replacements.push({ source, button })
    }

    const termButton = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null
      const button = target.closest<HTMLButtonElement>('button.glossary-term')
      return button && root.contains(button) ? button : null
    }

    const hoverCapable = () =>
      window.matchMedia('(hover: hover) and (pointer: fine)').matches

    const openTerm = (
      button: HTMLButtonElement,
      input: GlossaryInput,
      pinned: boolean,
    ) => {
      const key = button.dataset.glossaryKey
      if (!key || !entries[key]) return
      activeButtonRef.current = button
      send({
        type: 'open',
        key,
        presentation: chooseGlossaryPresentation({
          input,
          hoverCapable: hoverCapable(),
        }),
        pinned,
      })
    }

    const shouldKeepTooltipOpen = (relatedTarget: EventTarget | null) =>
      containsTarget(activeButtonRef.current, relatedTarget) ||
      containsTarget(tooltipRef.current, relatedTarget)

    const closeUnpinnedTooltip = (relatedTarget: EventTarget | null) => {
      const current = stateRef.current
      if (
        current.status === 'open' &&
        current.presentation === 'tooltip' &&
        !current.pinned &&
        !shouldKeepTooltipOpen(relatedTarget)
      ) {
        close()
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.pointerType === 'mouse' ||
        event.pointerType === 'touch' ||
        event.pointerType === 'pen'
      ) {
        lastInputRef.current = event.pointerType
      }
    }

    const onPointerOver = (event: PointerEvent) => {
      const button = termButton(event.target)
      if (
        !button ||
        event.pointerType !== 'mouse' ||
        containsTarget(button, event.relatedTarget)
      ) {
        return
      }
      lastInputRef.current = 'mouse'
      openTerm(button, 'mouse', false)
    }

    const onPointerOut = (event: PointerEvent) => {
      const button = termButton(event.target)
      if (!button || containsTarget(button, event.relatedTarget)) return
      closeUnpinnedTooltip(event.relatedTarget)
    }

    const onFocusIn = (event: FocusEvent) => {
      const button = termButton(event.target)
      if (button && lastInputRef.current === 'keyboard') {
        openTerm(button, 'keyboard', false)
      }
    }

    const onFocusOut = (event: FocusEvent) => {
      const button = termButton(event.target)
      if (!button || containsTarget(button, event.relatedTarget)) return
      closeUnpinnedTooltip(event.relatedTarget)
    }

    const onClick = (event: MouseEvent) => {
      const button = termButton(event.target)
      if (!button) return
      event.preventDefault()

      const key = button.dataset.glossaryKey
      if (!key) return
      const input = lastInputRef.current
      const presentation = chooseGlossaryPresentation({
        input,
        hoverCapable: hoverCapable(),
      })
      activeButtonRef.current = button

      if (
        presentation === 'tooltip' &&
        stateRef.current.status === 'open' &&
        stateRef.current.key === key &&
        stateRef.current.presentation === 'tooltip'
      ) {
        send({ type: 'toggle-pin', key })
        return
      }

      send({ type: 'open', key, presentation, pinned: true })
    }

    const onDocumentPointerDown = (event: PointerEvent) => {
      if (stateRef.current.status === 'closed') return
      if (
        containsTarget(activeButtonRef.current, event.target) ||
        containsTarget(tooltipRef.current, event.target) ||
        containsTarget(sheetRef.current, event.target)
      ) {
        return
      }
      close()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Tab' ||
        event.key === 'Enter' ||
        event.code === 'Space' ||
        event.key.startsWith('Arrow')
      ) {
        lastInputRef.current = 'keyboard'
      }
      if (event.key === 'Escape') close()
    }

    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointerover', onPointerOver)
    root.addEventListener('pointerout', onPointerOut)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    root.addEventListener('click', onClick)
    document.addEventListener('pointerdown', onDocumentPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointerover', onPointerOver)
      root.removeEventListener('pointerout', onPointerOut)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      root.removeEventListener('click', onClick)
      document.removeEventListener('pointerdown', onDocumentPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      for (const { source, button } of replacements) {
        if (button.isConnected) button.replaceWith(source)
      }
    }
  }, [close, entries, rootId, send])

  useEffect(() => {
    const previous = annotatedButtonRef.current
    if (previous && previous !== activeButtonRef.current) {
      previous.removeAttribute('aria-expanded')
      previous.removeAttribute('aria-controls')
      previous.removeAttribute('aria-describedby')
      previous.removeAttribute('aria-haspopup')
    }

    const active = activeButtonRef.current
    annotatedButtonRef.current = state.status === 'open' ? active : null
    if (!active) return

    if (state.status === 'closed') {
      active.removeAttribute('aria-expanded')
      active.removeAttribute('aria-controls')
      active.removeAttribute('aria-describedby')
      active.removeAttribute('aria-haspopup')
      return
    }

    active.setAttribute('aria-expanded', 'true')
    active.setAttribute('aria-controls', overlayId)
    if (state.presentation === 'tooltip') {
      active.setAttribute('aria-describedby', overlayId)
      active.removeAttribute('aria-haspopup')
    } else {
      active.setAttribute('aria-haspopup', 'dialog')
      active.removeAttribute('aria-describedby')
    }
  }, [overlayId, state])

  useLayoutEffect(() => {
    if (state.status !== 'open' || state.presentation !== 'tooltip') {
      return
    }

    const measure = () => {
      const anchor = activeButtonRef.current?.getBoundingClientRect()
      const tooltip = tooltipRef.current?.getBoundingClientRect()
      if (!anchor || !tooltip) return
      setTooltipPosition(
        placeGlossaryTooltip(
          anchor,
          tooltip,
          { width: window.innerWidth, height: window.innerHeight },
          8,
        ),
      )
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [state])

  useEffect(() => {
    if (state.status !== 'open' || state.presentation !== 'sheet') return

    const trigger = activeButtonRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [state])

  const activeEntry = state.status === 'open' ? entries[state.key] : undefined
  if (state.status === 'closed' || !activeEntry) return null

  if (state.presentation === 'tooltip') {
    return (
      <div
        id={overlayId}
        ref={tooltipRef}
        className="glossary-tooltip"
        role="tooltip"
        data-side={tooltipPosition?.side}
        style={{
          top: tooltipPosition?.top ?? 0,
          left: tooltipPosition?.left ?? 0,
          visibility: tooltipPosition ? 'visible' : 'hidden',
        }}
        onPointerLeave={event => {
          if (
            state.pinned ||
            containsTarget(activeButtonRef.current, event.relatedTarget)
          ) {
            return
          }
          close()
        }}
      >
        <strong>{activeEntry.name}</strong>
        <p>{activeEntry.definition}</p>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        className="glossary-sheet-backdrop"
        aria-label={closeLabel}
        onClick={close}
      />
      <section
        id={overlayId}
        ref={sheetRef}
        className="glossary-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${overlayId}-title`}
      >
        <div className="glossary-sheet-handle" aria-hidden="true" />
        <button
          ref={closeButtonRef}
          type="button"
          className="glossary-sheet-close"
          onClick={close}
          aria-label={closeLabel}
        >
          <span aria-hidden="true">×</span>
        </button>
        <h2 id={`${overlayId}-title`}>{activeEntry.name}</h2>
        <p>{activeEntry.definition}</p>
      </section>
    </>
  )
}
