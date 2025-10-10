
import { useEffect } from "react";
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
  };

  const selectYesterday = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    console.log('📅 Selected Yesterday:', yesterday);
    setDateRange({ from: yesterday, to: yesterday });
  };

  const selectThisWeek = () => {
    const today = new Date();
    const firstDayOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    firstDayOfWeek.setDate(diff);
    console.log('📅 Selected This Week:', { from: firstDayOfWeek, to: today });
    setDateRange({ from: firstDayOfWeek, to: today });
  };

  const selectThisMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    console.log('📅 Selected This Month:', { from: firstDayOfMonth, to: today });
    setDateRange({ from: firstDayOfMonth, to: today });
  };

  const isDateRangeSelectable = ![
    'x_reading',
    'daily_shift'
  ].includes(reportType);

  return (
    <div className="flex flex-col gap-4">
      {isDateRangeSelectable ? (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Start Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? format(dateRange.from, 'PP') : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(date) => {
                      console.log('📅 Start date selected:', date);
                      if (date) {
                        // If end date is before new start date, adjust it
                        const newEndDate = dateRange?.to && dateRange.to < date ? date : dateRange?.to;
                        setDateRange({ from: date, to: newEndDate });
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.to ? format(dateRange.to, 'PP') : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange?.to}
                    onSelect={(date) => {
                      console.log('📅 End date selected:', date);
                      if (date) {
                        setDateRange({ 
                          from: dateRange?.from, 
                          to: date 
                        });
                      }
                    }}
                    disabled={(date) => {
                      // Disable dates before the start date
                      return dateRange?.from ? date < dateRange.from : false;
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Quick Selection Buttons */}
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
        </>
      ) : (
        // Single date picker for X/Z reading and daily shift
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? format(dateRange.from, 'PPP') : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange?.from}
                onSelect={(date) => {
                  console.log('📅 Single date selected:', date);
                  setDateRange({ from: date, to: date });
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
