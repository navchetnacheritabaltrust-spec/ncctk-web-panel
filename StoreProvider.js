// app/StoreProvider.js
'use client'; // This directive is essential for Next.js App Router

import { makeStore } from '@/redux/store';
import React, { useRef } from 'react';
import { Provider } from 'react-redux';

export default function StoreProvider({ children }) {
  // Use a ref to ensure the store is only created once per application lifecycle
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}