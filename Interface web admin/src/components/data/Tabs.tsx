import type { ReactNode } from "react"

export type TabItem = {
  id: string
  label: ReactNode
  badge?: string
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={`button button--ghost tab ${value === tab.id ? "tab--active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.badge ? <span className="tab__badge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}
