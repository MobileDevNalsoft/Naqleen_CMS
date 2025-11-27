import React from 'react';

interface EventHandlerProps {
  children: React.ReactNode;
}

const EventHandler: React.FC<EventHandlerProps> = ({ children }) => {
  const handleClick = (event: any) => {
    console.log('Clicked object:', event.object?.name || 'unknown');
  };

  const handlePointerOver = (event: any) => {
    console.log('Hovered object:', event.object?.name || 'unknown');
  };

  const handlePointerOut = () => {
    // Handle pointer out
  };

  return (
    <group onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      {children}
    </group>
  );
};

export default EventHandler;
