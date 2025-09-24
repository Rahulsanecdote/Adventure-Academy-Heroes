import * as React from 'react';
import type { SVGProps } from 'react';

function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 13.4-4.5 2.1.8-5-3.6-3.3 5.1-.7L12 2.5l2.2 4.5 5.1.7-3.6 3.3.8 5-4.5-2.1Z" />
      <path d="M12 13.4V22" />
      <path d="M10.2 14.8c.8-.5 1.5-1.2 2-2.1.5-.8 1-1.8.8-2.9-.2-1.1-.9-2.1-2-2.8" />
      <path d="M16.5 17.5 12 15l-4.5 2.5" />
      <path d="M12 22v-2.5" />
    </svg>
  );
}

export default Logo;
