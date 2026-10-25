import { useState } from 'react';
import { ActionButton } from '../src/components/actions/action-button';
import { AmountField } from '../src/components/money/amount-field';
import { SettlementBadge } from '../src/components/money/settlement-badge';
import { PersonAvatar } from '../src/components/people/person-avatar';
import type { ComponentSize } from '../src/design/component-size';

const sizes: readonly { value: ComponentSize; label: string }[] = [
  { value: 'small', label: 'Nhỏ' },
  { value: 'regular', label: 'Chuẩn' },
  { value: 'large', label: 'Lớn' },
];

export function ComponentSizes() {
  const [amount, setAmount] = useState('1234567');
  const [selectedSize, setSelectedSize] = useState<ComponentSize>('regular');
  return (
    <section className="component-size-preview" aria-labelledby="component-size-title">
      <h3 id="component-size-title">Kích thước</h3>
      <div className="component-size-grid">
        {sizes.map((size) => (
          <article
            key={size.value}
            className="component-size-card"
            data-selected={selectedSize === size.value}
          >
            <strong>{size.label}</strong>
            <div className="component-size-examples">
              <PersonAvatar name="Minh Anh" size={size.value} />
              <SettlementBadge state="partial" size={size.value} />
            </div>
            <AmountField label="Số tiền" value={amount} onChange={setAmount} size={size.value} />
            <ActionButton
              icon="add"
              size={size.value}
              emphasis={selectedSize === size.value ? 'primary' : 'secondary'}
              onClick={() => setSelectedSize(size.value)}
            >
              Chọn
            </ActionButton>
          </article>
        ))}
      </div>
    </section>
  );
}
