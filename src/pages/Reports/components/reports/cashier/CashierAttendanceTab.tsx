
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Image } from "lucide-react";
import { CashierReport } from "@/types/reports";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";

interface CashierAttendanceTabProps {
  data: CashierReport;
}

export function CashierAttendanceTab({ data }: CashierAttendanceTabProps) {
  // Format date and time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not recorded";
    try {
      return format(new Date(dateString), "MMM dd, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      {data.attendance && data.attendance.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cashier Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Start Shift</TableHead>
                    <TableHead>Start Image</TableHead>
                    <TableHead>End Shift</TableHead>
                    <TableHead>End Image</TableHead>
                    <TableHead className="text-right">Starting Cash</TableHead>
                    <TableHead className="text-right">Ending Cash</TableHead>
                    <TableHead className="text-right">Cash Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.attendance.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>{formatDateTime(record.startTime)}</TableCell>
                      <TableCell>
                        {record.startPhoto ? (
                          <div className="relative h-12 w-16 overflow-hidden rounded-md border">
                            <img
                              src={record.startPhoto}
                              alt="Start shift"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-16 items-center justify-center rounded-md border bg-muted">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(record.endTime)}</TableCell>
                      <TableCell>
                        {record.endPhoto ? (
                          <div className="relative h-12 w-16 overflow-hidden rounded-md border">
                            <img
                              src={record.endPhoto}
                              alt="End shift"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-16 items-center justify-center rounded-md border bg-muted">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(record.startingCash)}</TableCell>
                      <TableCell className="text-right">
                        {record.endingCash !== null ? formatCurrency(record.endingCash) : "Not recorded"}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.endingCash !== null ? (
                          <span className={`font-medium ${
                            record.endingCash - record.startingCash > 0 ? 'text-green-600' :
                            record.endingCash - record.startingCash < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {record.endingCash - record.startingCash >= 0 ? '+' : ''}
                            {formatCurrency(record.endingCash - record.startingCash)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <CardContent>
            <p>No attendance data available for this period</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
