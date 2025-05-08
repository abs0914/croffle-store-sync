
import React from 'react';
import { Store } from "@/types";

interface QRHeaderProps {
  store: Store | null;
}

export const QRHeader = ({ store }: QRHeaderProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-croffle-primary">Store QR Code</h1>
      <p className="text-gray-500">
        Generate a QR code for customers to scan and join your loyalty program
      </p>
    </div>
  );
};
