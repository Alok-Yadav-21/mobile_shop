// Working out which steps of a journey to draw, and where along it a record has got to.
//
// Pure, and separate from the component, because every bug this has had was arithmetic rather
// than markup: a finished journey drawn as though its last step were still running, a step
// counter counting steps it had just filtered out, a stage ticked green for something that
// never happened.

export function journeySteps({
  flow, history = [], status,
  stoppedStates = [], finishedStates = [],
  indexOf = null, timeOf = null,
}) {
  const cancelled = stoppedStates.includes(status)
  // A journey that has finished is not "on" its last step, it is past it.
  const finished = finishedStates.includes(status)

  const position = indexOf || ((s) => flow.indexOf(s))
  const at = timeOf ? (s) => timeOf(s, history) : (s) => history.find((h) => h[0] === s)

  const currentIndex = cancelled
    ? flow.reduce((last, s, i) => (history.some((h) => position(h[0]) === i) ? i : last), -1)
    : position(status)

  // Past the stopping point there is nothing meaningful to show.
  const inScope = cancelled ? flow.slice(0, currentIndex + 1) : flow

  // A step already behind the current position that never appears in the history did not
  // happen. The flow allows Booking received straight to Device received, so a customer who
  // walked in was shown "Waiting for your device" ticked green with no timestamp beneath it,
  // claiming a step they were never asked to take. Only steps BEHIND the current position can
  // be judged; one ahead has simply not happened yet.
  const steps = inScope.filter((s, i) => i >= currentIndex || !!at(s))

  const currentStep = inScope[currentIndex]
  const shownIndex = currentStep === undefined ? -1 : steps.indexOf(currentStep)
  const reached = Math.max(0, shownIndex)
  const pct = steps.length > 1 ? (reached / (steps.length - 1)) * 100 : 0

  return { steps, shownIndex, reached, pct, cancelled, finished, at }
}

// How one step should be drawn, given where the journey has got to.
export function stepState({ index, shownIndex, cancelled, finished }) {
  return {
    isStop: cancelled && index === shownIndex,
    done: index < shownIndex || (finished && index === shownIndex),
    active: !cancelled && !finished && index === shownIndex,
  }
}
