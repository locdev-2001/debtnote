import { useState } from 'react';
import type { IconWeight } from 'reicon-react';
import { AppIcon, type AppIconName, appIconDefinitions } from '../src/components/app-icon';

export function IconGallery() {
  const [weight, setWeight] = useState<IconWeight>('Outline');
  const iconNames = Object.keys(appIconDefinitions) as AppIconName[];

  return (
    <>
      <fieldset className="icon-weight-controls">
        <legend className="visually-hidden">Kiểu biểu tượng Reicon</legend>
        <button
          type="button"
          aria-pressed={weight === 'Outline'}
          onClick={() => setWeight('Outline')}
        >
          Nét
        </button>
        <button
          type="button"
          aria-pressed={weight === 'Filled'}
          onClick={() => setWeight('Filled')}
        >
          Đặc
        </button>
      </fieldset>
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
