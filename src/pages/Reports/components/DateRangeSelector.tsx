
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportType } from "..";

interface DateRangeSelectorProps {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  reportType: ReportType;
}

export function DateRangeSelector({ dateRange, setDateRange, reportType }: DateRangeSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Set appropriate default dates based on report type
  useEffect(() => {
    const today = new Date();
    
    switch (reportType) {
      case 'x_reading':
        // Today only
        setDateRange({
          from: today,
          to: today
        });
        break;
      case 'z_reading':
        // Today by default, but allow selection
        setDateRange({
          from: today,
          to: today
        });
        break;
      case 'sales':
      case 'expense':
      case 'profit_loss':
      case 'vat':
      case 'cashier':
        // Default to current month if not already set
        if (!dateRange.from) {
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          setDateRange({
            from: firstDayOfMonth,
            to: today
          });
        }
        break;
    }
  }, [reportType]);

  // Quick date range options
  const selectToday = () => {
    const today = new Date();
    setDateRange({ from: today, to: today });
    setIsCalendarOpen(false);
  };

  const selectYesterday = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    setDateRange({ from: yesterday, to: yesterday });
    setIsCalendarOpen(false);
  };

  const selectThisWeek = () => {
    const today = new Date();
    const firstDayOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    firstDayOfWeek.setDate(diff);
    setDateRange({ from: firstDayOfWeek, to: today });
    setIsCalendarOpen(false);
  };

  const selectThisMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({ from: firstDayOfMonth, to: today });
    setIsCalendarOpen(false);
  };

  // Show date format based on report type
  const formatDateRange = () => {
    // Safety check for undefined dateRange
    if (!dateRange) {
      return "Select date range";
    }
    
    if (
      reportType === 'x_reading' || 
      reportType === 'z_reading'
    ) {
      // Single date format
      return dateRange.from ? format(dateRange.from, 'PPP') : "Select date";
    } else {
      // Date range format
      if (dateRange.from && dateRange.to) {
        if (format(dateRange.from, 'PP') === format(dateRange.to, 'PP')) {
          return format(dateRange.from, 'PPP');
        }
        return `${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}`;
      }
      return "Select date range";
    }
  };

  const isDateRangeSelectable = ![
    'x_reading'
  ].includes(reportType);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
      <div>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {isDateRangeSelectable ? (
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={setDateRange as any}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            ) : (
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange.from}
                selected={dateRange.from}
                onSelect={(date) => setDateRange({ from: date, to: date })}
                numberOfMonths={1}
                className={cn("p-3 pointer-events-auto")}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>

      {isDateRangeSelectable && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={selectToday}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={selectYesterday}>
            Yesterday
          </Button>
          <Button size="sm" variant="outline" onClick={selectThisWeek}>
            This Week
          </Button>
          <Button size="sm" variant="outline" onClick={selectThisMonth}>
            This Month
          </Button>
        </div>
      )}
    </div>
  );
}
