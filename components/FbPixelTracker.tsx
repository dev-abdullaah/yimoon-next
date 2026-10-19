// components/FbPixelTracker.tsx
'use client';

import React, { useEffect } from 'react';
import { initFacebookPixel } from '@/utils/fbpixel';

export default function FbPixelTracker(): null {
  useEffect(() => {
    initFacebookPixel();
  }, []);

  return null;
}
