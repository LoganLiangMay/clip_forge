import React from 'react';

export const TitleBar: React.FC = () => {
  return (
    <div
      className="h-9 bg-secondary"
      style={{
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    />
  );
};
