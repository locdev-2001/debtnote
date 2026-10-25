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
