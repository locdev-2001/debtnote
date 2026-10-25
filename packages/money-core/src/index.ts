export interface MoneyShare {
  readonly participantId: string;
  readonly amount: number;
}

function assertMinorUnits(amount: number): void {
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
