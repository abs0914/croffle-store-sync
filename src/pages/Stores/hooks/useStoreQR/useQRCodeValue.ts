
import { useState, useEffect } from "react";
import { Store } from "@/types";

export const useQRCodeValue = (store: Store | null) => {
  const [qrValue, setQRValue] = useState("");
  const appUrl = window.location.origin;
  
  useEffect(() => {
    if (store) {
      const url = `${appUrl}/customer-form/${store.id}`;
      setQRValue(url);
    }
  }, [store, appUrl]);
  
  return qrValue;
};
