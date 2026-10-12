import { useMemo, useState } from 'react'
import { Button, Spin } from 'antd'
import { Pencil, User } from 'lucide-react'
import { useAdminActions } from '@/hooks/useAdminActions'
import {
  useGetActiveCancellationPolicyQuery,
  useUpdateActiveCancellationPolicyMutation,
  type CancellationPolicy,
  type FeeShareRule,
  type UpdateCancellationPolicyBody,
} from '@/redux/api/cancellationPolicyApi'
import { EditCancellationPolicyModal } from '@/features/cancellations/components/EditCancellationPolicyModal'
import { formatCurrency, formatDateTime } from '@/utils/format'

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2.5">
      <p className="text-xs text-alygo-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function RuleCard({
  title,
  description,
  rule,
  showDriverCompensation = true,
}: {
  title: string
  description: string
  rule: FeeShareRule
  showDriverCompensation?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="mt-0.5 text-xs text-alygo-text-muted">{description}</p>
      </div>
      <div className={`grid gap-2 ${showDriverCompensation ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Metric label="Cancellation Fee" value={formatCurrency(rule.cancellationFee)} />
        <Metric label="Platform Share" value={formatCurrency(rule.platformShare)} />
        {showDriverCompensation && (
          <Metric
            label="Driver Compensation"
            value={formatCurrency(rule.driverCompensation ?? 0)}
          />
        )}
      </div>
    </div>
  )
}

function toFormValues(policy: CancellationPolicy): UpdateCancellationPolicyBody {
  return {
    passenger: {
      beforeDriverAccepted: {
        cancellationFee: policy.passenger.beforeDriverAccepted.cancellationFee,
        platformShare: policy.passenger.beforeDriverAccepted.platformShare,
        driverCompensation: policy.passenger.beforeDriverAccepted.driverCompensation ?? 0,
      },
      afterDriverAccepted: {
        cancellationFee: policy.passenger.afterDriverAccepted.cancellationFee,
        platformShare: policy.passenger.afterDriverAccepted.platformShare,
        driverCompensation: policy.passenger.afterDriverAccepted.driverCompensation ?? 0,
      },
      afterDriverArrived: {
        cancellationFee: policy.passenger.afterDriverArrived.cancellationFee,
        platformShare: policy.passenger.afterDriverArrived.platformShare,
        driverCompensation: policy.passenger.afterDriverArrived.driverCompensation ?? 0,
      },
    },
    driver: {
      afterAccept: {
        cancellationFee: policy.driver?.afterAccept?.cancellationFee ?? 0,
        platformShare: policy.driver?.afterAccept?.platformShare ?? 0,
      },
      excessiveCancellation: {
        cancellationFee: policy.driver?.excessiveCancellation?.cancellationFee ?? 0,
        platformShare: policy.driver?.excessiveCancellation?.platformShare ?? 0,
      },
      excessiveCancellationThreshold: policy.driver?.excessiveCancellationThreshold ?? 0,
    },
  }
}

export function CancellationPolicyPanel() {
  const adminActions = useAdminActions()
  const { data: policy, isLoading, isFetching } = useGetActiveCancellationPolicyQuery()
  const [updatePolicy, { isLoading: saving }] = useUpdateActiveCancellationPolicyMutation()
  const [editOpen, setEditOpen] = useState(false)

  const formValues = useMemo(
    () => (policy ? toFormValues(policy) : null),
    [policy],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spin />
      </div>
    )
  }

  if (!policy?.passenger || !formValues) {
    return (
      <div className="glass-card p-8 text-center text-alygo-text-muted">
        No active cancellation policy found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Active Cancellation Policy</h3>
          <p className="mt-1 text-sm text-alygo-text-muted">
            {policy.updatedAt
              ? `Last updated ${formatDateTime(policy.updatedAt)}`
              : 'Platform-wide fee rules for user cancellations'}
          </p>
        </div>
        <Button
          type="primary"
          icon={<Pencil className="h-4 w-4" />}
          loading={isFetching}
          onClick={() => setEditOpen(true)}
        >
          Edit Policy
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/10 p-2">
            <User className="h-4 w-4 text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-alygo-text-muted">
            User Cancellation
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <RuleCard
            title="Before Driver Accepted"
            description="Passenger cancels before a driver accepts the trip"
            rule={policy.passenger.beforeDriverAccepted}
          />
          <RuleCard
            title="After Driver Accepted"
            description="Passenger cancels after a driver has accepted"
            rule={policy.passenger.afterDriverAccepted}
          />
          <RuleCard
            title="After Driver Arrived"
            description="Passenger cancels after the driver has arrived"
            rule={policy.passenger.afterDriverArrived}
          />
        </div>
      </section>

      <EditCancellationPolicyModal
        open={editOpen}
        initialValues={formValues}
        confirmLoading={saving}
        onCancel={() => setEditOpen(false)}
        onSubmit={async (values) => {
          try {
            await updatePolicy(values).unwrap()
            adminActions.notify('Cancellation policy updated')
            setEditOpen(false)
          } catch {
            adminActions.notify('Unable to update cancellation policy')
          }
        }}
      />
    </div>
  )
}
