/**
 * Searches for DOM element matching the class name selector and removes it.
 * Backs off exponentially until `maxAttempts` is reached.
 * @returns A promise that resolves when the element is removed, else rejects and terminates.
 */
const deleteOverlay = (selector: string, maxAttempts = 3, delay = 200): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const attemptUntilDeleteOrBackoff = () => {
      attempts++
      const element = document.querySelector(selector)

      if (element) {
        console.log(`Found element on attempt: ${attempts}`)
        element.remove()
        resolve()
      } else if (attempts < maxAttempts) {
        setTimeout(attemptUntilDeleteOrBackoff, delay)
        delay *= 2
      } else {
        reject(new Error(`Failed to find overlay element within ${maxAttempts} attempts`))
      }
    }

    attemptUntilDeleteOrBackoff()
  })

}

/**
 * Overrides the style that is obscuring the clues.
 */
const unhideClues = () => {
  const styleOverrideElement = document.createElement('style')
  styleOverrideElement.innerHTML = '.xwd__clue-list--obscured li span:last-child {background-color:transparent;color:unset}'
  document.head.appendChild(styleOverrideElement)
}

/**
 * Removes the obscured class from the clue bar banner.
 */
const unobscureBanner = () => {
  const element = document.querySelector('.xwd__clue-bar-desktop--bar')
  element?.classList.remove("obscured")
}

/**
 * Extracts cell location (e.g. 1A), clue text, answer length, and letter position from a cell's aria-label.
 */
const parseAriaLabel = (ariaLabel: string) => {
  const cellLocation = ariaLabel.slice(0, 2)
  const clueMatch = ariaLabel.match(new RegExp(`${cellLocation}: (.+?), Answer:`))
  const answerMatch = ariaLabel.match(/Answer: (\d+) letters/)
  const letterMatch = ariaLabel.match(/Letter: (\d+)/)

  return {
    cellLocation,
    clueMatch: clueMatch ? clueMatch[1] : null,
    answerLength: answerMatch ? parseInt(answerMatch[1]) : null,
    letterPosition: letterMatch ? parseInt(letterMatch[1]) : null
  }
}

/**
 * Returns the focused rect cell and its aria-label, else null.
 */
const getActiveRect = () => {
  const rect = document.querySelector('rect[tabindex="0"]')
  const ariaLabel = rect?.getAttribute('aria-label')
  return rect && ariaLabel ? { rect, ariaLabel } : null
}

/**
 * Returns the text element used for user-entered letters within a cell.
 */
const getActiveText = (cell: Element) =>
  // bit of a hack here to get the text component, it just happens to have this font size
  cell.parentElement?.querySelector('text[font-size="66.67"]') ?? null

/**
 * Removes all user-entered text nodes from an element, returns whether any were found.
 */
const removeTextNodes = (parent: Element) => {
  let found = false
  Array.from(parent.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      found = true
      node.remove()
    }
  })
  return found
}

/**
 * Moves focus from the current rect to the adjacent cell in the given direction.
 */
const moveFocus = (rect: Element, direction: 'forward' | 'backward') => {
  const nextRect = findNextCell(rect, direction)
  if (!nextRect) return

  rect.setAttribute('tabindex', '-1')
  rect.classList.remove('xwd__cell--selected')

  nextRect.setAttribute('tabindex', '0')
  nextRect.classList.add('xwd__cell--selected');
  (nextRect as HTMLElement).focus()
}

/**
 * Finds the adjacent cell rect in the same clue, based on letter position and direction.
 */
const findNextCell = (currentRect: Element, direction: 'forward' | 'backward') => {
  const currentLabel = currentRect.getAttribute('aria-label')
  if (!currentLabel) return null

  const { letterPosition } = parseAriaLabel(currentLabel)
  if (!letterPosition) return null

  const nextLetterNum = direction === 'forward'
    ? letterPosition + 1
    : letterPosition - 1

  const cluePrefix = currentLabel.split(',')[0]

  const allRects = document.querySelectorAll('rect[role="cell"]')

  for (const rect of allRects) {
    const label = rect.getAttribute('aria-label')
    if (label && label.startsWith(cluePrefix)) {
      const { letterPosition: pos } = parseAriaLabel(label)
      if (pos === nextLetterNum) {
        return rect
      }
    }
  }

  return null
}

/**
 * Updates the clue bar banner with the currently focused cell's clue text.
 */
const updateClue = () => {
  const active = getActiveRect()
  if (!active) return

  const { cellLocation, clueMatch } = parseAriaLabel(active.ariaLabel)
  const element = document.querySelector('.xwd__clue-bar-desktop--bar')
  if (!element || !clueMatch) return

  Array.from(element.childNodes).forEach(node => node.remove())

  const locationPromptElement = document.createElement('div')
  locationPromptElement.className = "xwd__clue-bar-desktop--number"
  locationPromptElement.innerText = cellLocation
  element.appendChild(locationPromptElement)

  const cluePromptElement = document.createElement('div')
  cluePromptElement.className = "xwd__clue-bar-desktop--text xwd__clue-format"
  cluePromptElement.innerText = clueMatch
  element.appendChild(cluePromptElement)
}

/**
 * Register controls for puzzle input.
 */
const makePlayable = () => {
  document.addEventListener('keydown', (e) => {
    const activeCell = document.activeElement
    if (activeCell?.getAttribute('role') !== 'cell') return

    if (e.key.match(/^[a-zA-Z]$/)) {
      const parentText = getActiveText(activeCell)

      if (parentText?.querySelector('.xwd__cell--hidden')) {
        removeTextNodes(parentText)
        parentText.appendChild(document.createTextNode(e.key.toUpperCase()))
      }

      const active = getActiveRect()
      if (!active) return

      const { answerLength, letterPosition } = parseAriaLabel(active.ariaLabel)
      if (letterPosition !== null && answerLength !== null && letterPosition < answerLength) {
        moveFocus(active.rect, 'forward')
      }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      const parentText = getActiveText(activeCell)
      const hadLetter = parentText ? removeTextNodes(parentText) : false

      if (!hadLetter) {
        const active = getActiveRect()
        if (!active) return

        const { letterPosition } = parseAriaLabel(active.ariaLabel)
        if (letterPosition !== null && letterPosition > 1) {
          moveFocus(active.rect, 'backward')
        }

        const newParent = document.activeElement ? getActiveText(document.activeElement) : null
        if (newParent) {
          removeTextNodes(newParent)
        }
      }
    }
  })

  document.addEventListener('focusin', updateClue)
  document.addEventListener('click', updateClue)
}

deleteOverlay(".xwd__modal--wrapper")
  .then(() => {
    unhideClues()
    unobscureBanner()
    makePlayable()
  })
  .catch(err => console.error(err))
