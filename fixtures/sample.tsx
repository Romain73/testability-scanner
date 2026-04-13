// Fixtures for manual testing of the source analyzer

// Good: labelled button with test ID
export function GoodButton() {
  return <button data-testid="submit-btn" aria-label="Submit form">Submit</button>
}

// Bad: button with no data-testid
export function NoTestId() {
  return <button onClick={() => {}}>Click me</button>
}

// Bad: input with no label
export function UnlabelledInput() {
  return <input type="text" />
}

// Bad: div used as button without role
export function FakeDivButton() {
  return <div onClick={() => {}}>Open menu</div>
}

// Bad: duplicate test IDs
export function DuplicateIds() {
  return (
    <div>
      <button data-testid="action-btn">Save</button>
      <button data-testid="action-btn">Delete</button>
    </div>
  )
}

// Bad: icon-only button
export function IconButton() {
  return <button><img src="close.svg" /></button>
}
