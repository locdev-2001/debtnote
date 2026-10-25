export interface MoneyShare {
  readonly participantId: string;
  readonly amount: number;
}

export function assertMinorUnits(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError('Số tiền phải là số nguyên không âm trong giới hạn an toàn.');
  }
}

export function splitEvenly(
  amount: number,
  participantIds: readonly string[],
): readonly MoneyShare[] {
  assertMinorUnits(amount);

  if (
    participantIds.length === 0 ||
    participantIds.some((participantId) => participantId.trim().length === 0) ||
    new Set(participantIds).size !== participantIds.length
  ) {
    throw new Error('Cần ít nhất một người tham gia và không được trùng mã người.');
  }

  const orderedParticipantIds = [...participantIds].sort();
  const baseAmount = Math.floor(amount / orderedParticipantIds.length);
  const remainder = amount % orderedParticipantIds.length;

  // Cố định thứ tự nhận phần dư để đổi thứ tự chọn người không làm đổi kết quả.
  return orderedParticipantIds.map((participantId, index) => ({
    participantId,
    amount: baseAmount + (index < remainder ? 1 : 0),
  }));
}

export function calculateOutstandingAmount(
  principalAmount: number,
  confirmedAllocations: readonly number[],
): number {
  assertMinorUnits(principalAmount);
  let outstandingAmount = principalAmount;

  for (const allocatedAmount of confirmedAllocations) {
    assertMinorUnits(allocatedAmount);

    if (allocatedAmount > outstandingAmount) {
      throw new RangeError('Tổng tiền phân bổ không được vượt khoản nợ.');
    }

    outstandingAmount -= allocatedAmount;
  }

  return outstandingAmount;
}

export interface SharedExpenseItem {
  readonly amount: number;
  readonly participantIds: readonly string[];
}

export function splitExpenseItems(
  items: readonly SharedExpenseItem[],
  participantIds: readonly string[],
): readonly MoneyShare[] {
  const totals = new Map(splitEvenly(0, participantIds).map((share) => [share.participantId, 0]));
  let expenseTotal = 0;
  for (const item of items) {
    expenseTotal += item.amount;
    assertMinorUnits(expenseTotal);
    for (const share of splitEvenly(item.amount, item.participantIds)) {
      const previousAmount = totals.get(share.participantId);
      if (previousAmount === undefined) throw new Error('Người được chia không thuộc khoản chi.');
      const nextAmount = previousAmount + share.amount;
      assertMinorUnits(nextAmount);
      totals.set(share.participantId, nextAmount);
    }
  }
  return [...totals].map(([participantId, amount]) => ({ participantId, amount }));
}

export function allocateProportionally(
  amount: number,
  weights: readonly MoneyShare[],
): readonly MoneyShare[] {
  assertMinorUnits(amount);
  const totalWeight = weights.reduce((total, share) => {
    assertMinorUnits(share.amount);
    const sum = total + share.amount;
    assertMinorUnits(sum);
    return sum;
  }, 0);
  if (!totalWeight) {
    if (amount) throw new Error('Không có phần chia để phân bổ.');
    return weights.map((share) => ({ participantId: share.participantId, amount: 0 }));
  }
  const denominator = BigInt(totalWeight);
  const allocations = weights.map((share) => {
    const numerator = BigInt(amount) * BigInt(share.amount);
    return {
      participantId: share.participantId,
      amount: Number(numerator / denominator),
      remainder: numerator % denominator,
    };
  });
  let remaining = amount - allocations.reduce((total, share) => total + share.amount, 0);
  const priority = [...allocations].sort((left, right) =>
    left.remainder === right.remainder
      ? left.participantId.localeCompare(right.participantId)
      : left.remainder > right.remainder
        ? -1
        : 1,
  );
  for (const share of priority) {
    if (!remaining) break;
    share.amount += 1;
    remaining -= 1;
  }
  return allocations.map(({ participantId, amount: allocated }) => ({
    participantId,
    amount: allocated,
  }));
}

export function calculateBillSplit(
  items: readonly SharedExpenseItem[],
  participantIds: readonly string[],
  mode: 'equal' | 'custom',
  fee = 0,
  discount = 0,
) {
  assertMinorUnits(fee);
  assertMinorUnits(discount);
  const baseTotal = items.reduce((total, item) => {
    assertMinorUnits(item.amount);
    const sum = total + item.amount;
    assertMinorUnits(sum);
    return sum;
  }, 0);
  const grossTotal = baseTotal + fee;
  assertMinorUnits(grossTotal);
  if (discount > grossTotal) throw new Error('Giảm giá vượt tổng tiền.');
  const baseShares =
    mode === 'equal'
      ? splitEvenly(baseTotal, participantIds)
      : splitExpenseItems(items, participantIds);
  const fees = allocateProportionally(fee, baseShares);
  const grossShares = baseShares.map((share) => ({
    participantId: share.participantId,
    amount:
      share.amount + (fees.find((part) => part.participantId === share.participantId)?.amount ?? 0),
  }));
  const discounts = allocateProportionally(discount, grossShares);
  const shares = grossShares.map((share) => ({
    participantId: share.participantId,
    amount:
      share.amount -
      (discounts.find((part) => part.participantId === share.participantId)?.amount ?? 0),
  }));
  return { totalAmount: grossTotal - discount, baseTotal, shares, fees, discounts };
}
