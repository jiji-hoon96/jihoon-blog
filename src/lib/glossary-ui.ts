export type GlossaryPresentation = 'tooltip' | 'sheet'
export type GlossaryInput = 'keyboard' | 'mouse' | 'touch' | 'pen'

export type GlossaryUiState =
  | { status: 'closed' }
  | {
      status: 'open'
      key: string
      presentation: GlossaryPresentation
      pinned: boolean
    }

export type GlossaryUiAction =
  | {
      type: 'open'
      key: string
      presentation: GlossaryPresentation
      pinned: boolean
    }
  | { type: 'toggle-pin'; key: string }
  | { type: 'close' }

export type Rect = {
  top: number
  left: number
  width: number
  height: number
}

export type Size = {
  width: number
  height: number
}

export type Viewport = Size

export type TooltipPlacement = {
  top: number
  left: number
  side: 'top' | 'bottom'
}

export function chooseGlossaryPresentation({
  input,
  hoverCapable,
}: {
  input: GlossaryInput
  hoverCapable: boolean
}): GlossaryPresentation {
  if (input === 'keyboard' || input === 'mouse') return 'tooltip'
  return input === 'pen' && hoverCapable ? 'tooltip' : 'sheet'
}

export function glossaryUiReducer(
  state: GlossaryUiState,
  action: GlossaryUiAction,
): GlossaryUiState {
  if (action.type === 'open') {
    return {
      status: 'open',
      key: action.key,
      presentation: action.presentation,
      pinned: action.pinned,
    }
  }

  if (action.type === 'close') return { status: 'closed' }
  if (state.status === 'closed' || state.key !== action.key) return state
  if (state.pinned) return { status: 'closed' }

  return { ...state, pinned: true }
}

export function placeGlossaryTooltip(
  anchor: Rect,
  tooltip: Size,
  viewport: Viewport,
  gap = 8,
): TooltipPlacement {
  const top = anchor.top - tooltip.height - gap
  const side = top >= gap ? 'top' : 'bottom'
  const centeredLeft = anchor.left + anchor.width / 2 - tooltip.width / 2
  const maximumLeft = Math.max(gap, viewport.width - tooltip.width - gap)

  return {
    top: side === 'top' ? top : anchor.top + anchor.height + gap,
    left: Math.min(Math.max(centeredLeft, gap), maximumLeft),
    side,
  }
}
