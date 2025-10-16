import React from 'react'
import { Plano } from '../../types'
import { PlanCard } from './PlanCard'

interface PlanListProps {
  plans: Plano[]
  currentPlanId?: number
  layout?: 'grid' | 'list'
  showPopularBadge?: boolean
  onPlanSelect?: (plan: Plano) => void
  className?: string
}

export const PlanList: React.FC<PlanListProps> = ({
  plans,
  currentPlanId,
  layout = 'grid',
  showPopularBadge = false,
  onPlanSelect,
  className = ''
}) => {
  const cheapestPlan = plans.reduce(
    (prev, current) => (prev.price < current.price ? prev : current),
    plans[0]
  )

  const gridClasses =
    layout === 'grid'
      ? 'grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6'
      : 'space-y-4'

  return (
    <div className={`${gridClasses} ${className}`}>
      {plans.map(plan => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrentPlan={plan.id === currentPlanId}
          showPopularBadge={showPopularBadge && plan.id === cheapestPlan.id}
          onSelect={onPlanSelect}
        />
      ))}
    </div>
  )
}
