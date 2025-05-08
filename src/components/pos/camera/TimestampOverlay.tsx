
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface TimestampOverlayProps {
  storeName?: string;
}

export default function TimestampOverlay({ storeName }: TimestampOverlayProps) {
  const [timestamp, setTimestamp] = useState<string>(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
  
  // Update timestamp every second
  useEffect(() => {
    const timerId = setInterval(() => {
      setTimestamp(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
    }, 1000);
    
    return () => clearInterval(timerId);
  }, []);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 flex justify-between">
      <span>{storeName || ''}</span>
      <span>{timestamp}</span>
    </div>
  );
}
