
import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

type DisplayMode = "full" | "compact" | "hidden";

interface StoreDisplayConfig {
  headerMode: DisplayMode;
  sidebarMode: DisplayMode;
  contentMode: DisplayMode;
}

interface StoreDisplayContextType {
  config: StoreDisplayConfig;
  updateConfig: (newConfig: Partial<StoreDisplayConfig>) => void;
}

const defaultConfig: StoreDisplayConfig = {
  headerMode: "compact", // Default to compact in header
  sidebarMode: "full",   // Full display in sidebar
  contentMode: "hidden"  // Hidden in content by default
};

const StoreDisplayContext = createContext<StoreDisplayContextType>({
  config: defaultConfig,
  updateConfig: () => {},
});

export function StoreDisplayProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoreDisplayConfig>(defaultConfig);
  const location = useLocation();
  
  // Adjust display modes based on current route
  useState(() => {
    if (location.pathname === '/pos') {
      // In POS, show in content, hide in header
      setConfig({
        headerMode: "hidden",
        sidebarMode: "full",
        contentMode: "full"
      });
    } else if (location.pathname.includes('/inventory')) {
      // In inventory, compact in header, hidden in content
      setConfig({
        headerMode: "compact",
        sidebarMode: "compact",
        contentMode: "hidden"
      });
    } else {
      // Default configuration
      setConfig(defaultConfig);
    }
  }, [location.pathname]);

  const updateConfig = (newConfig: Partial<StoreDisplayConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  return (
    <StoreDisplayContext.Provider value={{ config, updateConfig }}>
      {children}
    </StoreDisplayContext.Provider>
  );
}

export const useStoreDisplay = () => useContext(StoreDisplayContext);
