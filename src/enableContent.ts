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

deleteOverlay(".xwd__modal--wrapper")
  .then(() => {
    unhideClues()
  })
  .catch(err => console.error(err))
