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

const unhideClues = () => {
  const styleOverrideElement = document.createElement('style')
  styleOverrideElement.innerHTML = '.xwd__clue-list--obscured li span:last-child {background-color:transparent;color:unset}'
  document.head.appendChild(styleOverrideElement)
}

const unobscureBanner = () => {
  const element = document.querySelector('.xwd__clue-bar-desktop--bar')
  element?.classList.remove("obscured")
}

const parseAriaLabel = (ariaLabel: string) => {
  const answerMatch = ariaLabel.match(/Answer: (\d+) letters/)
  const letterMatch = ariaLabel.match(/Letter: (\d+)/)

  return {
    answerLength: answerMatch ? parseInt(answerMatch[1]) : null,
    letterPosition: letterMatch ? parseInt(letterMatch[1]) : null
  }
}

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

const makePlayable = () => {
  document.addEventListener('keydown', (e) => {
    if (e.key.match(/^[a-zA-Z]$/)) {
      const activeCell = document.activeElement
      if (activeCell?.getAttribute('role') === 'cell') {
        // bit of a hack here to get the 'active' cell, it just happens to have this font size
        const parentText = activeCell.parentElement?.querySelector('text[font-size="66.67"]')

        if (parentText) {
          const hiddenText = parentText.querySelector('.xwd__cell--hidden')

          if (hiddenText) {
            // delete previously entered letter
            Array.from(parentText.childNodes).forEach(node => {
              if (node.nodeType === Node.TEXT_NODE) {
                node.remove()
              }
            })

            parentText.appendChild(document.createTextNode(e.key.toUpperCase()))
          }
        }

        const rect = document.querySelector('rect[tabindex="0"]')
        const ariaLabel = rect?.getAttribute('aria-label')

        if (ariaLabel && rect) {
          const { answerLength, letterPosition } = parseAriaLabel(ariaLabel)

          const canMoveForward = letterPosition !== null && answerLength !== null && letterPosition < answerLength
          if (canMoveForward) {
            rect.setAttribute('tabindex', '-1')
            rect.classList.remove('xwd__cell--selected', 'xwd__cell--highlighted')

            const nextRect = findNextCell(rect, 'forward')
            if (nextRect) {
              nextRect.setAttribute('tabindex', '0')
              nextRect.classList.add('xwd__cell--selected', 'xwd__cell--highlighted');
              (nextRect as HTMLElement).focus()
            }

          }
        }
      }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      const activeCell = document.activeElement
      if (activeCell?.getAttribute('role') === 'cell') {
        const parentText = activeCell.parentElement?.querySelector('text[font-size="66.67"]')

        if (parentText) {
          Array.from(parentText.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              node.remove()
            }
          })
        }

        const rect = document.querySelector('rect[tabindex="0"]')
        const ariaLabel = rect?.getAttribute('aria-label')

        if (ariaLabel && rect) {
          const { answerLength, letterPosition } = parseAriaLabel(ariaLabel)

          const canMoveBackward = letterPosition !== null && letterPosition > 1
          if (canMoveBackward) {
            rect.setAttribute('tabindex', '-1')
            rect.classList.remove('xwd__cell--selected', 'xwd__cell--highlighted')

            const nextRect = findNextCell(rect, 'backward')
            if (nextRect) {
              nextRect.setAttribute('tabindex', '0')
              nextRect.classList.add('xwd__cell--selected', 'xwd__cell--highlighted');
              (nextRect as HTMLElement).focus()
            }

          }
        }
      }
    }
  })
}

deleteOverlay(".xwd__modal--wrapper")
  .then(() => {
    unhideClues()
    unobscureBanner()
    makePlayable()
  })
  .catch(err => console.error(err))
