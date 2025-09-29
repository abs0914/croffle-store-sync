
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
    console.log('🗓️ DateRangeSelector useEffect triggered:', { reportType, currentDateRange: dateRange });
    const today = new Date();
    
    switch (reportType) {
      case 'x_reading':
      case 'z_reading':
      case 'daily_shift':
        // Single date reports - Today only
        console.log('📅 Setting single date for report type:', reportType);
        setDateRange({
          from: today,
          to: today
        });
        break;
      case 'sales':
      case 'expense':
      case 'profit_loss':
      case 'void_report':
      case 'cashier':
        // Default to current month if not already set
        if (!dateRange.from) {
          console.log('📅 Setting default month range for report type:', reportType);
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          setDateRange({
            from: firstDayOfMonth,
            to: today
          });
        }
        break;
    }
  }, [reportType, setDateRange]); // Added missing dependencies

  // Quick date range options
  const selectToday = () => {
    const today = new Date();
    console.log('📅 Selected Today:', today);
    setDateRange({ from: today, to: today });
    setIsCalendarOpen(false);
  };

  const selectYesterday = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    console.log('📅 Selected Yesterday:', yesterday);
    setDateRange({ from: yesterday, to: yesterday });
    setIsCalendarOpen(false);
  };

  const selectThisWeek = () => {
    const today = new Date();
    const firstDayOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    firstDayOfWeek.setDate(diff);
    console.log('📅 Selected This Week:', { from: firstDayOfWeek, to: today });
    setDateRange({ from: firstDayOfWeek, to: today });
    setIsCalendarOpen(false);
  };

  const selectThisMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    console.log('📅 Selected This Month:', { from: firstDayOfMonth, to: today });
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
      reportType === 'z_reading' ||
      reportType === 'daily_shift'
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
    'x_reading',
    'daily_shift'
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
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  console.log('📅 Calendar range selected:', range);
                  if (range && range.from) {
                    setDateRange({
                      from: range.from,
                      to: range.to || range.from
                    });
                  }
                }}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            ) : (
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange?.from}
                selected={dateRange?.from}
                onSelect={(date) => {
                  console.log('📅 Calendar single date selected:', date);
                  setDateRange({ from: date, to: date });
                }}
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
