import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { ReportsNavigation } from "./ReportsNavigation";
import { ReportType } from "..";

interface CollapsibleReportsNavigationProps {
  activeReport: ReportType;
  onSelectReport: (report: ReportType) => void;
  isMobile: boolean;
}

export function CollapsibleReportsNavigation({ 
  activeReport, 
  onSelectReport, 
  isMobile 
}: CollapsibleReportsNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get saved state from localStorage
    const saved = localStorage.getItem('reportsNavCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('reportsNavCollapsed', JSON.stringify(newState));
  };

  if (isMobile) {
    return (
      <ReportsNavigation 
        activeReport={activeReport} 
        onSelectReport={onSelectReport}
      />
    );
  }

  return (
    <div className={`transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <Card className="relative p-2">
        {/* Collapse/Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
          onClick={toggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {isCollapsed ? (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full p-2"
              onClick={toggleCollapse}
              title="Expand Navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <ReportsNavigation 
            activeReport={activeReport} 
            onSelectReport={onSelectReport}
          />
        )}
      </Card>
    </div>
  );
}