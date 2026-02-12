const deleteOverlay = (selector: string, maxAttempts = 3, delay = 200) => {
  let attempts = 0

  const attemptUntilDeleteOrBackoff = () => {
    attempts++
    const element = document.querySelector(selector)

    if (element) {
      console.log(`Found element on attempt: ${attempts}`)
      element.remove()
      return
    } else if (attempts < maxAttempts) {
      setTimeout(attemptUntilDeleteOrBackoff, delay)
      delay *= 2
    }  else {
      console.error(`Failed to find overlay element within ${maxAttempts} attempts`)
    }
  }

  attemptUntilDeleteOrBackoff()
}

deleteOverlay(".xwd__modal--wrapper")