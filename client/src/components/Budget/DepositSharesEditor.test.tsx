import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '../../../tests/helpers/render'
import MCostInstallmentsSection from '../../mobile/screens/trip/sheets/MCostInstallmentsSection'
import { CostInstallmentsSection } from './CostInstallmentsSection'
import { useInstallmentDrafts } from './useInstallmentDrafts'

const people = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
const fullShares = { 1: 419.65, 2: 419.65 }

function DepositHarness({ mobile, planningOnly = false }: { mobile: boolean; planningOnly?: boolean }) {
  const shares = planningOnly ? {} : fullShares
  const total = planningOnly ? 100 : 839.3
  const state = useInstallmentDrafts(null, total, shares)
  return mobile
    ? <MCostInstallmentsSection state={state} currency="EUR" total={total} people={people} fullShares={shares} />
    : <CostInstallmentsSection state={state} currency="EUR" total={total} people={people} fullShares={shares} labelCls="text-content" />
}

describe.each([false, true])('deposit split editor (mobile: %s)', mobile => {
  it('shows each deposit’s participant shares, paid state, and the calculated remainder', () => {
    render(<DepositHarness mobile={mobile} />)
    const section = screen.getByTestId(mobile ? 'm-installments-section' : 'installments-section')
    fireEvent.click(within(section).getByRole('button', { name: 'Add deposit' }))
    const first = within(section).getByTestId(mobile ? 'm-installment-row' : 'installment-row')
    fireEvent.change(within(first).getByTestId('installment-amount'), { target: { value: '200' } })
    expect(within(first).getByLabelText('Amount – Alice')).toHaveValue('100')
    expect(within(first).getByLabelText('Amount – Bob')).toHaveValue('100')
    fireEvent.click(within(first).getByRole('button', { name: 'Paid' }))
    expect(within(first).getByRole('button', { name: 'Paid' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(section).getByRole('button', { name: 'Add deposit' }))
    const second = within(section).getAllByTestId(mobile ? 'm-installment-row' : 'installment-row')[1]!
    fireEvent.change(within(second).getByTestId('installment-amount'), { target: { value: '100' } })
    fireEvent.change(within(second).getByLabelText('Amount – Alice'), { target: { value: '0' } })
    fireEvent.change(within(second).getByLabelText('Amount – Bob'), { target: { value: '100' } })
    const remainder = within(section).getByTestId('deposit-remainder')
    expect(remainder).toHaveTextContent('Remaining amount')
    expect(remainder).toHaveTextContent(/319[,.]65/)
    expect(remainder).toHaveTextContent(/219[,.]65/)
  })
})

it('shows planning-only deposits as unassigned and keeps the monetary remainder', () => {
  render(<DepositHarness mobile={false} planningOnly />)
  fireEvent.click(screen.getByRole('button', { name: 'Add deposit' }))
  fireEvent.change(screen.getByTestId('installment-amount'), { target: { value: '30' } })
  expect(screen.getByTestId('deposit-remainder')).toHaveTextContent(/70[,.]00/)
  expect(screen.getByTestId('deposit-remainder')).toHaveTextContent('Unassigned')
})
