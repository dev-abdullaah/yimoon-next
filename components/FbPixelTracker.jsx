// components/FbPixelTracker.jsx
'use client';

import { useEffect } from 'react';
import { initFacebookPixel } from '@/utils/fbpixel';

export default function FbPixelTracker() {
  useEffect(() => {
    initFacebookPixel();
  }, []);

  return null;
}