import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface TabItem<T extends string> { value: T; label: string; count?: number; description?: string }

const tabId = (base: string, value: string) => `${base}-tab-${value}`
const panelId = (base: string, value: string) => `${base}-panel-${value}`

/**
 * WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends.
 * `idBase` (from useId in the parent) links each tab with its <TabPanel>.
 */
export function Tabs<T extends string>({ idBase, tabs, value, onChange, label, orientation = 'horizontal' }: { idBase: string; tabs: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string; orientation?: 'horizontal' | 'vertical' }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  function move(event: KeyboardEvent, index: number) {
    const [previous, following] = orientation === 'vertical' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']
    let next: number
    if (event.key === previous) next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === following) next = (index + 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    refs.current[next]?.focus()
    onChange(tabs[next].value)
  }
  return (
    <div className={`tabs tabs-${orientation}`} role="tablist" aria-label={label} aria-orientation={orientation}>
      {tabs.map((tab, index) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.value}
            ref={(node) => { refs.current[index] = node }}
            type="button"
            role="tab"
            id={tabId(idBase, tab.value)}
            aria-selected={selected}
            aria-controls={panelId(idBase, tab.value)}
            tabIndex={selected ? 0 : -1}
            className={selected ? 'tab-active' : undefined}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => move(event, index)}
          >
            <span className="tab-label">{tab.label}{tab.count !== undefined && <span className="tab-count">{tab.count}</span>}</span>
            {tab.description && <span className="tab-description">{tab.description}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idBase, value, children }: { idBase: string; value: string; children: ReactNode }) {
  return <div role="tabpanel" id={panelId(idBase, value)} aria-labelledby={tabId(idBase, value)} tabIndex={0} className="tab-panel">{children}</div>
}

/** Mutually exclusive filter shown as pressed buttons with counts. */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string; count?: number }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}{option.count !== undefined && <span className="segmented-count">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
