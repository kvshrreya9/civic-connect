import { CircleDot, Construction, Droplets, HelpCircle, Lightbulb, Trash2, TreePine, Waves } from 'lucide-react'
import { CATEGORIES } from '../../data/dummyData.js'

export const CATEGORY_ICONS = { CircleDot, Construction, Droplets, HelpCircle, Lightbulb, Trash2, TreePine, Waves }

export default function CategorySelect({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="label">What kind of issue is it?</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
        {CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category.icon] || HelpCircle
          const selected = value === category.value
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={category.value}
              onClick={() => onChange(category.value)}
              title={category.hint}
              className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
                selected ? 'border-electric-500 bg-electric-50 ring-2 ring-electric-200' : 'border-slate-200 bg-white hover:border-electric-300'
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: category.color }}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-navy-900">{category.label}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  )
}
