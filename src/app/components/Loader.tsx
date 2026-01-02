"use client";

import React from 'react';

type LoaderProps = {
  size?: 'small' | 'medium' | 'large';
  text?: string;
};

export default function Loader({ size = 'medium', text }: LoaderProps) {
  const dims = size === 'small' ? 'w-8 h-8' : size === 'large' ? 'w-24 h-24' : 'w-16 h-16';
  const textClass = 'text-gray-400 text-sm mt-4';

  // Adjust inset and border sizes for small variant to avoid visual shifts
  const outerBorder = size === 'small' ? 'border-2' : 'border-4';
  const innerBorder = size === 'small' ? 'border-2' : 'border-4';
  const insetA = size === 'small' ? 'inset-0' : 'inset-0';
  const insetB = size === 'small' ? 'inset-1' : 'inset-2';
  const insetC = size === 'small' ? 'inset-2' : 'inset-4';

  return (
    <div className={`flex flex-col items-center justify-center py-6`}>
      <div className={`relative ${dims}`}>
        <div className={`absolute ${insetA} rounded-full ${outerBorder} border-gray-700`} />
        <div className={`absolute ${insetA} rounded-full ${innerBorder} border-blue-500 border-t-transparent animate-spin`} />
        <div
          className={`absolute ${insetB} rounded-full ${innerBorder} border-purple-500 border-b-transparent animate-spin`}
          style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
        />
        <div
          className={`absolute ${insetC} rounded-full ${innerBorder} border-green-500 border-l-transparent animate-spin`}
          style={{ animationDuration: '1.2s' }}
        />
      </div>
      {text ? <p className={textClass}>{text}</p> : null}
    </div>
  );
}
