import Image from 'next/image';
import * as React from 'react';

const Logo = (props: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) => (
  <Image src="/logo.svg" alt="HubQueue Logo" {...props} />
);

export default Logo;
