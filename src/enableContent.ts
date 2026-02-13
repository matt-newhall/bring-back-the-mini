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
