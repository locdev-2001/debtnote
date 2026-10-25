import { useState } from 'react';
import type { IconWeight } from 'reicon-react';
import { ChoiceGroup } from '../src/components/actions/choice-group';
import { AppIcon, type AppIconName, appIconDefinitions } from '../src/components/app-icon';

export function IconGallery() {
  const [weight, setWeight] = useState<IconWeight>('Outline');
  const iconNames = Object.keys(appIconDefinitions) as AppIconName[];

  return (
    <>
      <ChoiceGroup
        label="Kiểu biểu tượng Reicon"
        value={weight}
        onChange={setWeight}
        options={[
          { value: 'Outline', label: 'Nét' },
          { value: 'Filled', label: 'Đặc' },
        ]}
      />
      <div className="icon-grid">
        {iconNames.map((name) => (
          <div key={name}>
            <AppIcon name={name} weight={weight} />
            <span>{appIconDefinitions[name].label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
