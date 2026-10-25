export { emptyLedgerState } from '@debtnote/contracts';

import type {
  Bill,
  BillInput,
  Clock,
  CommandReceipt,
  Debt,
  DebtView,
  GuestDisputeInput,
  GuestRequest,
  GuestScope,
  IdGenerator,
  LedgerEvent,
  LedgerRepository,
  LedgerSnapshot,
  LedgerState,
  Payment,
  PaymentInput,
  Person,
  PromiseInput,
  QuickDebtInput,
  ShareInput,
} from '@debtnote/contracts';
import {
  assertMinorUnits,
  calculateBillSplit,
  calculateOutstandingAmount,
  splitEvenly,
} from '@debtnote/money-core';

export class DomainError extends Error {
  constructor(
    message: string,
    readonly kind: 'NOT_FOUND' | 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' = 'BAD_REQUEST',
  ) {
    super(message);
  }
}
function checkedSum(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => {
    assertMinorUnits(amount);
    const sum = total + amount;
    assertMinorUnits(sum);
    return sum;
  }, 0);
}
function confirmedAmounts(state: LedgerState, debtId: string): number[] {
  return state.payments
    .filter((payment) => payment.status === 'confirmed')
    .flatMap((payment) =>
      payment.allocations
        .filter((allocation) => allocation.debtId === debtId)
        .map((allocation) => allocation.amount),
    );
}
function remaining(state: LedgerState, debt: Debt): number {
  return calculateOutstandingAmount(debt.principalAmount, confirmedAmounts(state, debt.id));
}
function findDebt(state: LedgerState, id: string): Debt {
  const debt = state.debts.find((record) => record.id === id && record.status === 'active');
  if (!debt) throw new DomainError('Không tìm thấy khoản tiền.', 'NOT_FOUND');
  return debt;
}
function findPerson(state: LedgerState, id: string): Person {
  const person = state.people.find((record) => record.id === id);
  if (!person) throw new DomainError('Không tìm thấy người trong sổ.', 'NOT_FOUND');
  return person;
}
function dateAfter(date: string, days: number): string {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

export function projectLedger(state: LedgerState, today: string): LedgerSnapshot {
  const records: DebtView[] = state.debts
    .filter((debt) => debt.status === 'active')
    .map((debt) => {
      const amounts = confirmedAmounts(state, debt.id);
      const promise = state.promises.find((promise) => promise.debtId === debt.id);
      const promisedDate = promise?.date ?? null;
      const attentionDate = promisedDate ?? debt.dueDate;
      return {
        ...debt,
        personName: findPerson(state, debt.personId).name,
        confirmedAmounts: amounts,
        remainingAmount: calculateOutstandingAmount(debt.principalAmount, amounts),
        awaitingConfirmation: state.payments.some(
          (payment) =>
            payment.status === 'pending' &&
            payment.allocations.some((allocation) => allocation.debtId === debt.id),
        ),
        promisedDate,
        promisedAmount: Math.min(
          promise?.amount ?? 0,
          calculateOutstandingAmount(debt.principalAmount, amounts),
        ),
        forecastGroups: [],
        forecastAmounts: {},
        attentionDate,
        deadlineState: !attentionDate
          ? 'none'
          : attentionDate < today
            ? 'overdue'
            : attentionDate === today
              ? 'today'
              : 'upcoming',
        forecastGroup: null,
        disputed: state.disputes.some(
          (dispute) => dispute.debtId === debt.id && dispute.status === 'open',
        ),
      };
    });
  const receivables = records.filter((record) => record.direction === 'receivable');
  const confirmed = state.payments.filter((payment) => payment.status === 'confirmed');
  const forecast = { promised: 0, due: 0, overdue: 0, later: 0, undated: 0 };
  const horizon = dateAfter(today, 7);
  for (const record of receivables.filter((record) => record.remainingAmount > 0)) {
    const portions = [
      { amount: record.promisedAmount, date: record.promisedDate, promised: true },
      {
        amount: record.remainingAmount - record.promisedAmount,
        date: record.dueDate,
        promised: false,
      },
    ];
    for (const portion of portions) {
      if (!portion.amount) continue;
      const group = !portion.date
        ? 'undated'
        : portion.date < today
          ? 'overdue'
          : portion.date > horizon
            ? 'later'
            : portion.promised
              ? 'promised'
              : 'due';
      record.forecastGroup ??= group;
      if (!record.forecastGroups.includes(group)) record.forecastGroups.push(group);
      record.forecastAmounts[group] = checkedSum([
        record.forecastAmounts[group] ?? 0,
        portion.amount,
      ]);
      forecast[group] = checkedSum([forecast[group], portion.amount]);
    }
  }
  const { commands: _commands, ...visibleState } = state;
  return {
    ...visibleState,
    today,
    records,
    forecast,
    totals: {
      receivable: checkedSum(receivables.map((record) => record.remainingAmount)),
      payable: checkedSum(
        records
          .filter((record) => record.direction === 'payable')
          .map((record) => record.remainingAmount),
      ),
      received: checkedSum(
        confirmed
          .filter((payment) => payment.direction === 'receivable')
          .map((payment) => payment.amount),
      ),
      paid: checkedSum(
        confirmed
          .filter((payment) => payment.direction === 'payable')
          .map((payment) => payment.amount),
      ),
      advanced: checkedSum([
        ...state.bills
          .filter((bill) => bill.status === 'active' && bill.payerId === 'self')
          .map((bill) => bill.totalAmount),
        ...receivables.filter((record) => !record.billId).map((record) => record.principalAmount),
      ]),
      ownExpense: checkedSum(
        state.bills.filter((bill) => bill.status === 'active').map((bill) => bill.ownAmount),
      ),
      excess: checkedSum(confirmed.map((payment) => payment.excessAmount)),
    },
  };
}

export class LedgerService {
  constructor(
    private readonly repository: LedgerRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}
  snapshot(ownerId: string) {
    return this.repository.read(ownerId).then((state) => projectLedger(state, this.clock.today()));
  }
  private event(state: LedgerState, details: Omit<LedgerEvent, 'id' | 'createdAt'>) {
    state.events.push({ ...details, id: this.ids.create(), createdAt: this.clock.now() });
  }
  private notify(
    state: LedgerState,
    title: string,
    body: string,
    debtId: string | null,
    eventKey: string,
  ) {
    if (state.notifications.some((notification) => notification.eventKey === eventKey)) return;
    state.notifications.push({
      id: this.ids.create(),
      debtId,
      title,
      body,
      eventKey,
      readAt: null,
      createdAt: this.clock.now(),
    });
  }
  private once<Result>(
    ownerId: string,
    commandId: string,
    kind: string,
    input: unknown,
    operation: (state: LedgerState) => Result | Promise<Result>,
  ): Promise<Result> {
    const digest = this.ids.digest(JSON.stringify(input));
    return this.repository.transaction(ownerId, async (state) => {
      const previous = state.commands.find((command) => command.id === commandId);
      if (previous) {
        if (previous.kind !== kind || previous.digest !== digest)
          throw new DomainError('Yêu cầu này đã được dùng cho nội dung khác.', 'CONFLICT');
        return previous.result as Result;
      }
      let result: Result;
      try {
        result = await operation(state);
        projectLedger(state, this.clock.today());
      } catch (error) {
        if (error instanceof RangeError)
          throw new DomainError('Tổng tiền vượt giới hạn xử lý an toàn.');
        throw error;
      }
      const receipt: CommandReceipt = {
        id: commandId,
        kind,
        digest,
        result,
        createdAt: this.clock.now(),
      };
      state.commands.push(receipt);
      return result;
    });
  }
  savePerson(ownerId: string, input: { id?: string | undefined; name: string; phone: string }) {
    return this.repository.transaction(ownerId, (state) => {
      if (input.id) {
        const person = findPerson(state, input.id);
        person.name = input.name;
        person.phone = input.phone;
        return person;
      }
      const person: Person = {
        id: this.ids.create(),
        name: input.name,
        phone: input.phone,
        createdAt: this.clock.now(),
      };
      state.people.push(person);
      return person;
    });
  }
  createDebt(ownerId: string, input: QuickDebtInput) {
    return this.once(ownerId, input.commandId, 'create-debt', input, (state) => {
      const person = input.personId
        ? findPerson(state, input.personId)
        : {
            id: this.ids.create(),
            name: input.personName || 'Người khác',
            phone: '',
            createdAt: this.clock.now(),
          };
      if (!input.personId) state.people.push(person);
      const debt: Debt = {
        id: this.ids.create(),
        personId: person.id,
        billId: null,
        direction: input.direction,
        principalAmount: input.amount,
        note: input.note,
        dueDate: input.dueDate,
        status: 'active',
        createdAt: this.clock.now(),
      };
      state.debts.push(debt);
      this.event(state, {
        kind: 'debt-created',
        debtId: debt.id,
        billId: null,
        personId: debt.personId,
        summary: 'Tạo khoản tiền',
        amount: debt.principalAmount,
      });
      this.schedule(state, debt);
      return debt;
    });
  }
  createBill(ownerId: string, input: BillInput) {
    return this.once(ownerId, input.commandId, 'create-bill', input, (state) => {
      const participantIds = input.participants.map((person) => person.id);
      if (new Set(input.items.map((item) => item.id)).size !== input.items.length)
        throw new DomainError('Dòng bill bị trùng mã.');
      if (
        new Set(participantIds).size !== participantIds.length ||
        !['self', ...participantIds].includes(input.payerId)
      )
        throw new DomainError('Người tham gia hoặc người trả chưa hợp lệ.');
      const mapped = new Map<string, string>([['self', 'self']]);
      const participants = input.participants.map((participant) => {
        if (participant.id === 'self') return { id: 'self', name: 'Bạn' };
        let person = state.people.find((person) => person.id === participant.id);
        if (!person) {
          person = {
            id: participant.id,
            name: participant.name,
            phone: '',
            createdAt: this.clock.now(),
          };
          state.people.push(person);
        }
        mapped.set(participant.id, person.id);
        return { id: person.id, name: person.name };
      });
      const items = input.items.map((item) => {
        if (
          new Set(item.participantIds).size !== item.participantIds.length ||
          item.participantIds.some((id) => !participantIds.includes(id))
        )
          throw new DomainError('Phần chia có người không thuộc bill.');
        return {
          ...item,
          participantIds: item.participantIds.map((id) => mapped.get(id) as string),
        };
      });
      const ids = participants.map((person) => person.id);
      const result = calculateBillSplit(items, ids, input.mode, input.fee, input.discount);
      const payerId = mapped.get(input.payerId);
      if (!payerId) throw new DomainError('Chưa chọn người trả.');
      const bill: Bill = {
        id: this.ids.create(),
        title: input.title || 'Khoản chung',
        payerId,
        participants,
        items,
        mode: input.mode,
        fee: input.fee,
        discount: input.discount,
        totalAmount: result.totalAmount,
        ownAmount: result.shares.find((share) => share.participantId === 'self')?.amount ?? 0,
        status: 'active',
        attachmentId: input.attachmentId,
        createdAt: this.clock.now(),
      };
      state.bills.push(bill);
      const payableShares =
        payerId === 'self'
          ? result.shares.filter((share) => share.participantId !== 'self' && share.amount > 0)
          : result.shares.filter((share) => share.participantId === 'self' && share.amount > 0);
      const debts = payableShares.map((share) => {
        const debt: Debt = {
          id: this.ids.create(),
          personId: payerId === 'self' ? share.participantId : payerId,
          billId: bill.id,
          direction: payerId === 'self' ? 'receivable' : 'payable',
          principalAmount: share.amount,
          note: bill.title,
          dueDate: input.dueDate,
          status: 'active',
          createdAt: this.clock.now(),
        };
        state.debts.push(debt);
        this.schedule(state, debt);
        return debt;
      });
      state.drafts = state.drafts.filter((draft) => draft.id !== input.commandId);
      this.event(state, {
        kind: 'bill-created',
        debtId: null,
        billId: bill.id,
        personId: null,
        summary: 'Chốt bill',
        amount: bill.totalAmount,
      });
      return { bill, debts };
    });
  }
  private allocate(
    state: LedgerState,
    debtIds: readonly string[],
    personId: string,
    direction: 'receivable' | 'payable',
    amount: number,
  ) {
    if (new Set(debtIds).size !== debtIds.length)
      throw new DomainError('Khoản tiền bị chọn trùng.');
    let unapplied = amount;
    const allocations = debtIds
      .map((id) => {
        const debt = findDebt(state, id);
        if (debt.personId !== personId || debt.direction !== direction)
          throw new DomainError('Các khoản phải cùng người và cùng chiều tiền.');
        const applied = Math.min(unapplied, remaining(state, debt));
        unapplied -= applied;
        return { debtId: debt.id, amount: applied };
      })
      .filter((allocation) => allocation.amount > 0);
    if (!allocations.length) throw new DomainError('Các khoản đã được trả đủ.');
    return { allocations, excess: unapplied };
  }
  recordPayment(ownerId: string, input: PaymentInput) {
    return this.once(ownerId, input.commandId, 'record-payment', input, (state) => {
      findPerson(state, input.personId);
      const allocation = this.allocate(
        state,
        input.debtIds,
        input.personId,
        input.direction,
        input.amount,
      );
      const payment: Payment = {
        id: this.ids.create(),
        personId: input.personId,
        direction: input.direction,
        amount: input.amount,
        allocations: allocation.allocations,
        excessAmount: allocation.excess,
        status: 'confirmed',
        shareId: null,
        note: input.note,
        createdAt: this.clock.now(),
        confirmedAt: this.clock.now(),
      };
      state.payments.push(payment);
      for (const part of payment.allocations) {
        this.cancelSettled(state, part.debtId, part.amount);
        this.event(state, {
          kind: 'payment-confirmed',
          debtId: part.debtId,
          billId: null,
          personId: input.personId,
          summary: input.direction === 'receivable' ? 'Đã nhận tiền' : 'Đã trả tiền',
          amount: part.amount,
        });
      }
      return payment;
    });
  }
  confirmReport(ownerId: string, commandId: string, paymentId: string, accept: boolean) {
    return this.once(ownerId, commandId, 'confirm-report', { paymentId, accept }, (state) => {
      const payment = state.payments.find(
        (payment) => payment.id === paymentId && payment.status === 'pending',
      );
      if (!payment) throw new DomainError('Báo chuyển đã được xử lý.', 'CONFLICT');
      if (accept) {
        const result = this.allocate(
          state,
          payment.allocations.map((part) => part.debtId),
          payment.personId,
          payment.direction,
          payment.amount,
        );
        payment.allocations = result.allocations;
        payment.excessAmount = result.excess;
        payment.status = 'confirmed';
        payment.confirmedAt = this.clock.now();
        for (const part of payment.allocations) {
          this.cancelSettled(state, part.debtId, part.amount);
          this.event(state, {
            kind: 'payment-confirmed',
            debtId: part.debtId,
            billId: null,
            personId: payment.personId,
            summary: 'Xác nhận tiền về',
            amount: part.amount,
          });
        }
      } else {
        payment.status = 'rejected';
        this.event(state, {
          kind: 'payment-rejected',
          debtId: payment.allocations[0]?.debtId ?? null,
          billId: null,
          personId: payment.personId,
          summary: 'Chưa nhận được tiền',
          amount: payment.amount,
        });
      }
      return payment;
    });
  }
  private schedule(state: LedgerState, debt: Debt) {
    for (const reminder of state.reminders.filter(
      (reminder) => reminder.debtId === debt.id && reminder.status === 'scheduled',
    ))
      reminder.status = 'cancelled';
    const date = state.promises.find((promise) => promise.debtId === debt.id)?.date ?? debt.dueDate;
    if (
      state.preferences.remindersEnabled &&
      date &&
      debt.status === 'active' &&
      remaining(state, debt) > 0
    )
      state.reminders.push({
        id: this.ids.create(),
        debtId: debt.id,
        dueAt: this.clock.scheduledAt(date, state.preferences.remindHour),
        status: 'scheduled',
        createdAt: this.clock.now(),
      });
  }
  private cancelSettled(state: LedgerState, debtId: string, receivedAmount: number) {
    const debt = findDebt(state, debtId);
    const promise = state.promises.find((entry) => entry.debtId === debtId);
    if (promise) {
      promise.amount = Math.min(
        remaining(state, debt),
        Math.max(0, promise.amount - receivedAmount),
      );
      if (!promise.amount)
        state.promises = state.promises.filter((entry) => entry.id !== promise.id);
    }
    if (remaining(state, debt) > 0) {
      this.schedule(state, debt);
      return;
    }
    for (const pending of state.payments.filter((entry) => entry.status === 'pending')) {
      if (pending.allocations.every((part) => remaining(state, findDebt(state, part.debtId)) === 0))
        pending.status = 'rejected';
    }
    for (const reminder of state.reminders.filter(
      (reminder) => reminder.debtId === debtId && reminder.status === 'scheduled',
    ))
      reminder.status = 'cancelled';
    for (const dispute of state.disputes.filter(
      (dispute) => dispute.debtId === debtId && dispute.status === 'open',
    ))
      dispute.status = 'resolved';
  }
  private setPromise(state: LedgerState, debt: Debt, date: string, amount?: number) {
    if (date < this.clock.today()) throw new DomainError('Chọn ngày từ hôm nay.');
    const balance = remaining(state, debt);
    const promised = amount ?? balance;
    if (!promised || promised > balance) throw new DomainError('Số tiền hẹn vượt số còn nợ.');
    const previous = state.promises.find((promise) => promise.debtId === debt.id);
    if (previous) {
      previous.date = date;
      previous.amount = promised;
      previous.createdAt = this.clock.now();
    } else
      state.promises.push({
        id: this.ids.create(),
        debtId: debt.id,
        date,
        amount: promised,
        createdAt: this.clock.now(),
      });
    this.schedule(state, debt);
    this.event(state, {
      kind: 'promise',
      debtId: debt.id,
      billId: debt.billId,
      personId: debt.personId,
      summary: `Hẹn ${date.split('-').reverse().join('/')}`,
      amount: promised,
    });
  }
  promise(ownerId: string, input: PromiseInput) {
    return this.once(ownerId, input.commandId, 'promise', input, (state) => {
      this.setPromise(state, findDebt(state, input.debtId), input.date, input.amount);
      return { saved: true };
    });
  }
  createShare(ownerId: string, input: ShareInput) {
    return this.once(ownerId, input.commandId, 'create-share', input, (state) => {
      findPerson(state, input.personId);
      if (new Set(input.debtIds).size !== input.debtIds.length)
        throw new DomainError('Chọn khoản bị trùng.');
      for (const id of input.debtIds) {
        const debt = findDebt(state, id);
        if (debt.personId !== input.personId || debt.direction !== 'receivable')
          throw new DomainError('Chỉ tạo yêu cầu cho các khoản cần thu cùng người.');
      }
      const expiresAt = new Date(
        Date.parse(this.clock.now()) + input.days * 86_400_000,
      ).toISOString();
      const share = {
        id: this.ids.create(),
        personId: input.personId,
        debtIds: input.debtIds,
        expiresAt,
        revokedAt: null,
        createdAt: this.clock.now(),
      };
      state.shares.push(share);
      return share;
    });
  }
  revokeShare(ownerId: string, shareId: string) {
    return this.repository.transaction(ownerId, (state) => {
      const share = state.shares.find((share) => share.id === shareId);
      if (!share) throw new DomainError('Không tìm thấy link.', 'NOT_FOUND');
      share.revokedAt = this.clock.now();
      return { revoked: true };
    });
  }
  private scopedShare(state: LedgerState, scope: GuestScope) {
    const share = state.shares.find((share) => share.id === scope.shareId);
    if (!share || share.revokedAt || Date.parse(share.expiresAt) <= Date.parse(this.clock.now()))
      throw new DomainError('Link đã hết hạn hoặc bị thu hồi.', 'FORBIDDEN');
    const debts = share.debtIds.map((id) => findDebt(state, id));
    if (debts.some((debt) => debt.personId !== share.personId || debt.direction !== 'receivable'))
      throw new DomainError('Link không hợp lệ.', 'FORBIDDEN');
    return { share, debts };
  }
  async guestView(scope: GuestScope, collectorName: string): Promise<GuestRequest> {
    const state = await this.repository.read(scope.ownerId);
    const { share, debts } = this.scopedShare(state, scope);
    const person = findPerson(state, share.personId);
    const lines: GuestRequest['lines'] = [];
    const originalLines: GuestRequest['originalLines'] = [];
    const includedBills = new Set<string>();
    for (const debt of debts) {
      const bill = debt.billId ? state.bills.find((bill) => bill.id === debt.billId) : undefined;
      if (!bill) {
        originalLines.push({
          id: debt.id,
          title: debt.note || 'Khoản tiền',
          amount: debt.principalAmount,
        });
        lines.push({
          id: debt.id,
          debtId: debt.id,
          title: debt.note || 'Khoản tiền',
          totalAmount: debt.principalAmount,
          participantCount: 1,
          personalAmount: debt.principalAmount,
        });
        continue;
      }
      if (!includedBills.has(bill.id)) {
        includedBills.add(bill.id);
        originalLines.push(
          ...bill.items.map((item) => ({
            id: `${bill.id}:${item.id}`,
            title: item.title,
            amount: item.amount,
          })),
        );
        if (bill.fee) originalLines.push({ id: `${bill.id}:fee`, title: 'Phí', amount: bill.fee });
        if (bill.discount)
          originalLines.push({
            id: `${bill.id}:discount`,
            title: 'Giảm giá',
            amount: bill.discount,
            deduction: true,
          });
      }
      const ids = bill.participants.map((person) => person.id);
      const result = calculateBillSplit(bill.items, ids, bill.mode, bill.fee, bill.discount);
      if (bill.mode === 'equal') {
        lines.push({
          id: bill.id,
          debtId: debt.id,
          title: bill.title,
          totalAmount: bill.totalAmount,
          participantCount: ids.length,
          personalAmount: debt.principalAmount,
        });
      } else {
        for (const item of bill.items)
          lines.push({
            id: `${bill.id}:${item.id}`,
            debtId: debt.id,
            title: item.title,
            totalAmount: item.amount,
            participantCount: item.participantIds.length,
            personalAmount:
              splitEvenly(item.amount, item.participantIds).find(
                (part) => part.participantId === debt.personId,
              )?.amount ?? 0,
          });
      }
      if (bill.mode === 'custom') {
        for (const adjustment of [
          {
            id: 'fee',
            title: 'Phí',
            totalAmount: bill.fee,
            allocations: result.fees,
            deduction: false,
          },
          {
            id: 'discount',
            title: 'Giảm giá',
            totalAmount: bill.discount,
            allocations: result.discounts,
            deduction: true,
          },
        ]) {
          if (adjustment.totalAmount)
            lines.push({
              id: `${bill.id}:${adjustment.id}`,
              debtId: debt.id,
              title: adjustment.title,
              totalAmount: adjustment.totalAmount,
              participantCount: ids.length,
              personalAmount:
                adjustment.allocations.find((part) => part.participantId === debt.personId)
                  ?.amount ?? 0,
              deduction: adjustment.deduction,
              proportional: true,
              disputable: false,
            });
        }
      }
      if (checkedSum(result.shares.map((part) => part.amount)) !== bill.totalAmount)
        throw new DomainError('Phép chia chưa khớp.', 'CONFLICT');
    }
    const amounts = debts.flatMap((debt) => confirmedAmounts(state, debt.id));
    const principal = checkedSum(debts.map((debt) => debt.principalAmount));
    const promise = state.promises.find((promise) => share.debtIds.includes(promise.debtId));
    const dispute = state.disputes.find(
      (dispute) => share.debtIds.includes(dispute.debtId) && dispute.status === 'open',
    );
    const report = state.payments.find(
      (payment) => payment.shareId === share.id && payment.status === 'pending',
    );
    const dates = debts
      .map((debt) => debt.dueDate)
      .filter((date): date is string => date !== null)
      .sort();
    return {
      debtIds: share.debtIds,
      id: share.id,
      recipientName: person.name,
      collectorName,
      principalAmount: principal,
      confirmedAmounts: amounts,
      dueDate: dates[0] ?? null,
      access: 'active',
      billTotal: checkedSum(
        [...includedBills]
          .map((id) => state.bills.find((bill) => bill.id === id)?.totalAmount ?? 0)
          .concat(debts.filter((debt) => !debt.billId).map((debt) => debt.principalAmount)),
      ),
      originalLines,
      paymentQrPayload: null,
      reference: `DN${share.id.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      lines,
      response: {
        reportedAmount: report?.amount ?? null,
        promisedDate: promise?.date ?? null,
        promisedAmount: promise
          ? checkedSum(
              state.promises
                .filter(
                  (entry) => share.debtIds.includes(entry.debtId) && entry.date === promise.date,
                )
                .map((entry) => entry.amount),
            )
          : null,
        dispute: dispute
          ? { reason: dispute.reason, note: dispute.note, itemId: dispute.itemId }
          : null,
      },
    };
  }
  guestReport(scope: GuestScope, commandId: string, amount: number) {
    return this.once(
      scope.ownerId,
      commandId,
      'guest-report',
      { shareId: scope.shareId, amount },
      (state) => {
        const { share, debts } = this.scopedShare(state, scope);
        if (amount <= 0 || amount > checkedSum(debts.map((debt) => remaining(state, debt))))
          throw new DomainError('Số báo chuyển vượt số còn cần trả.');
        const allocation = this.allocate(
          state,
          share.debtIds,
          share.personId,
          'receivable',
          amount,
        );
        let report = state.payments.find(
          (payment) => payment.shareId === share.id && payment.status === 'pending',
        );
        if (report) {
          report.amount = amount;
          report.allocations = allocation.allocations;
        } else {
          report = {
            id: this.ids.create(),
            personId: share.personId,
            direction: 'receivable',
            amount,
            allocations: allocation.allocations,
            excessAmount: 0,
            status: 'pending',
            shareId: share.id,
            note: '',
            createdAt: this.clock.now(),
            confirmedAt: null,
          };
          state.payments.push(report);
        }
        this.notify(
          state,
          `${findPerson(state, share.personId).name} báo đã chuyển`,
          'Kiểm tra tiền về và xác nhận.',
          debts[0]?.id ?? null,
          `report:${commandId}`,
        );
        this.event(state, {
          kind: 'payment-reported',
          debtId: debts[0]?.id ?? null,
          billId: null,
          personId: share.personId,
          summary: 'Báo đã chuyển, chờ xác nhận',
          amount,
        });
        return { saved: true };
      },
    );
  }
  guestCancelReport(scope: GuestScope, commandId: string) {
    return this.once(
      scope.ownerId,
      commandId,
      'guest-cancel-report',
      { shareId: scope.shareId },
      (state) => {
        const { share } = this.scopedShare(state, scope);
        for (const payment of state.payments.filter(
          (payment) => payment.shareId === share.id && payment.status === 'pending',
        ))
          payment.status = 'rejected';
        return { saved: true };
      },
    );
  }
  guestPromise(scope: GuestScope, commandId: string, date: string, amount?: number) {
    return this.once(
      scope.ownerId,
      commandId,
      'guest-promise',
      { shareId: scope.shareId, date, amount },
      (state) => {
        const { share, debts } = this.scopedShare(state, scope);
        const balance = checkedSum(debts.map((debt) => remaining(state, debt)));
        if (!balance || (amount !== undefined && (amount <= 0 || amount > balance)))
          throw new DomainError('Số hẹn trả chưa hợp lệ.');
        state.promises = state.promises.filter(
          (promise) => !share.debtIds.includes(promise.debtId),
        );
        let unallocated = amount ?? balance;
        for (const debt of debts) {
          const promised = Math.min(unallocated, remaining(state, debt));
          if (promised) this.setPromise(state, debt, date, promised);
          else this.schedule(state, debt);
          unallocated -= promised;
        }
        this.notify(
          state,
          `${findPerson(state, share.personId).name} hẹn trả`,
          date.split('-').reverse().join('/'),
          debts[0]?.id ?? null,
          `promise:${commandId}`,
        );
        return { saved: true };
      },
    );
  }
  guestDispute(scope: GuestScope, input: Omit<GuestDisputeInput, 'key'>) {
    return this.once(
      scope.ownerId,
      input.commandId,
      'guest-dispute',
      { shareId: scope.shareId, ...input },
      (state) => {
        const { share } = this.scopedShare(state, scope);
        if (!share.debtIds.includes(input.debtId))
          throw new DomainError('Khoản này không thuộc link.', 'FORBIDDEN');
        const debt = findDebt(state, input.debtId);
        if (input.reason === 'items' && input.itemId) {
          const bill = state.bills.find((bill) => bill.id === debt.billId);
          if (
            !bill?.items.some(
              (item) => item.id === input.itemId || `${bill.id}:${item.id}` === input.itemId,
            )
          )
            throw new DomainError('Không tìm thấy dòng bill.');
        }
        let dispute = state.disputes.find(
          (dispute) => dispute.debtId === debt.id && dispute.status === 'open',
        );
        if (dispute) {
          dispute.reason = input.reason;
          dispute.note = input.note;
          dispute.itemId = input.itemId;
        } else {
          dispute = {
            id: this.ids.create(),
            debtId: debt.id,
            reason: input.reason,
            note: input.note,
            itemId: input.itemId,
            status: 'open',
            createdAt: this.clock.now(),
          };
          state.disputes.push(dispute);
        }
        this.notify(
          state,
          `${findPerson(state, share.personId).name} báo sai`,
          input.note || 'Mở khoản tiền để xem.',
          debt.id,
          `dispute:${input.commandId}`,
        );
        this.event(state, {
          kind: 'dispute',
          debtId: debt.id,
          billId: debt.billId,
          personId: debt.personId,
          summary: 'Báo sai phần tiền',
          amount: null,
        });
        return { saved: true };
      },
    );
  }
  resolveDispute(ownerId: string, disputeId: string) {
    return this.repository.transaction(ownerId, (state) => {
      const dispute = state.disputes.find((dispute) => dispute.id === disputeId);
      if (!dispute) throw new DomainError('Không tìm thấy báo sai.', 'NOT_FOUND');
      dispute.status = 'resolved';
      this.event(state, {
        kind: 'dispute-resolved',
        debtId: dispute.debtId,
        billId: null,
        personId: null,
        summary: 'Đã xử lý báo sai',
        amount: null,
      });
      return { saved: true };
    });
  }
  cancelDebt(ownerId: string, commandId: string, debtId: string) {
    return this.once(ownerId, commandId, 'cancel-debt', { debtId }, (state) => {
      const debt = findDebt(state, debtId);
      if (confirmedAmounts(state, debt.id).length)
        throw new DomainError('Khoản đã có thanh toán, không thể hủy trực tiếp.', 'CONFLICT');
      debt.status = 'cancelled';
      for (const share of state.shares.filter((entry) => entry.debtIds.includes(debtId)))
        share.revokedAt ??= this.clock.now();
      for (const reminder of state.reminders.filter((reminder) => reminder.debtId === debt.id))
        reminder.status = 'cancelled';
      for (const payment of state.payments.filter(
        (payment) =>
          payment.status === 'pending' &&
          payment.allocations.some((part) => part.debtId === debt.id),
      ))
        payment.status = 'rejected';
      this.event(state, {
        kind: 'debt-cancelled',
        debtId,
        billId: debt.billId,
        personId: debt.personId,
        summary: 'Hủy khoản tiền',
        amount: debt.principalAmount,
      });
      return { saved: true };
    });
  }
  saveDraft(ownerId: string, id: string, content: Record<string, unknown> | null) {
    return this.repository.transaction(ownerId, (state) => {
      state.drafts = state.drafts.filter((draft) => draft.id !== id);
      if (content) state.drafts.push({ id, content, updatedAt: this.clock.now() });
      return { saved: true };
    });
  }
  readNotifications(ownerId: string) {
    return this.repository.transaction(ownerId, (state) => {
      for (const notification of state.notifications) notification.readAt ??= this.clock.now();
      return { saved: true };
    });
  }
  rebuildReminders(ownerId: string) {
    return this.repository.transaction(ownerId, (state) => {
      for (const debt of state.debts.filter((debt) => debt.status === 'active'))
        this.schedule(state, debt);
      return { saved: true };
    });
  }
  processReminders(ownerId: string) {
    return this.repository.transaction(ownerId, (state) => {
      for (const reminder of state.reminders.filter(
        (reminder) =>
          reminder.status === 'scheduled' &&
          Date.parse(reminder.dueAt) <= Date.parse(this.clock.now()),
      )) {
        const debt = state.debts.find(
          (debt) => debt.id === reminder.debtId && debt.status === 'active',
        );
        if (!debt || remaining(state, debt) === 0) {
          reminder.status = 'cancelled';
          continue;
        }
        this.notify(
          state,
          `${findPerson(state, debt.personId).name} đến hẹn`,
          debt.note || 'Mở để xem khoản tiền.',
          debt.id,
          `reminder:${debt.id}:${this.clock.today()}`,
        );
        reminder.status = 'delivered';
        if (state.preferences.remindersEnabled)
          state.reminders.push({
            id: this.ids.create(),
            debtId: debt.id,
            dueAt: this.clock.scheduledAt(
              dateAfter(this.clock.today(), 1),
              state.preferences.remindHour,
            ),
            status: 'scheduled',
            createdAt: this.clock.now(),
          });
      }
      return { processed: true };
    });
  }
}
