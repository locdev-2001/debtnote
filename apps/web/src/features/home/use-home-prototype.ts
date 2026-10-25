import { useState } from 'react';
import type { HomePrototypeStore } from './demo-store';
import { applyHomeCommand, type HomeCommand, type HomeRecord } from './ledger';

export function useHomePrototype(store: HomePrototypeStore) {
  const [records, setRecords] = useState<HomeRecord[]>(() => store.load());
  const [notice, setNotice] = useState('');
  const [commandError, setCommandError] = useState('');

  function dispatch(command: HomeCommand, message: string) {
    try {
      const nextRecords = applyHomeCommand(records, command);
      setCommandError('');
      setRecords(nextRecords);
      const saved = store.save(nextRecords);
      setNotice(
        saved
          ? message
          : `${message} Chưa lưu được trên thiết bị; tải lại có thể mất thay đổi mẫu.`,
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chưa thực hiện được thao tác.';
      setNotice(message);
      setCommandError(message);
      return false;
    }
  }

  function reset() {
    const initialRecords = store.reset();
    setRecords(initialRecords);
    setNotice('Đã khôi phục mẫu.');
  }
  function clear() {
    store.save([]);
    setRecords([]);
    setNotice('Sổ mẫu trống.');
  }
  const people = [
    ...new Map(
      [
        ...store.people,
        ...records.map((record) => ({ id: record.personId, name: record.personName })),
      ].map((person) => [person.id, person]),
    ).values(),
  ];
  return {
    records,
    people,
    notice,
    commandError,
    clearCommandError: () => setCommandError(''),
    setNotice,
    dispatch,
    reset,
    clear,
  };
}
