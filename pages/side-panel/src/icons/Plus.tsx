import React from 'react';

interface PlusProps extends React.SVGProps<SVGSVGElement> {}

export default function Plus(props: PlusProps) {
  return (
    <svg width="800px" height="800px" viewBox="0 0 24 24" fill="current" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 12H20M12 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
