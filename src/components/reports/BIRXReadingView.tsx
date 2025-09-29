import React from 'react';
import { format } from 'date-fns';
import { BIRXReadingData } from '@/services/reports/modules/enhancedXReadingReport';
import { formatCurrency } from '@/utils/format';

interface BIRXReadingViewProps {
  data: BIRXReadingData;
}

export function BIRXReadingView({ data }: BIRXReadingViewProps) {
  return (
    <div className="font-mono text-xs bg-white p-4 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="font-bold">{data.businessName}</div>
        <div>{data.businessAddress}</div>
        <div>TIN: {data.tin}</div>
        <div>Taxpayer Name: {data.taxpayerName}</div>
        <div className="mt-2">
          <div>MIN: {data.machineId}</div>
          <div>S/N: {data.serialNumber}</div>
          <div>POS Ver: {data.posVersion}</div>
          {data.permitNumber && <div>Permit#: {data.permitNumber}</div>}
        </div>
      </div>

      {/* Reading Info */}
      <div className="border-t border-b border-dashed border-gray-400 py-2 mb-4">
        <div className="text-center font-bold">X-READING</div>
        <div className="text-center">#{data.readingNumber.toString().padStart(4, '0')}</div>
        <div className="text-center">{format(data.readingDate, 'MM/dd/yyyy hh:mm:ss a')}</div>
        <div className="text-center">TERMINAL: {data.terminalId}</div>
        <div className="text-center">CASHIER: {data.cashierName}</div>
      </div>

      {/* Reset Counter */}
      <div className="mb-4">
        <div className="font-bold">RESET COUNTER: {data.resetCounter}</div>
      </div>

      {/* Transaction Range */}
      <div className="mb-4">
        <div>BEG SI#: {data.beginningReceiptNumber}</div>
        <div>END SI#: {data.endingReceiptNumber}</div>
        <div>TRANS COUNT: {data.transactionCount}</div>
      </div>

      {/* Accumulated Grand Total */}
      <div className="mb-4">
        <div className="font-bold underline">ACCUMULATED GRAND TOTAL</div>
        <div className="flex justify-between">
          <span>GROSS SALES:</span>
          <span>{formatCurrency(data.accumulatedGrossSales)}</span>
        </div>
        <div className="flex justify-between">
          <span>NET SALES:</span>
          <span>{formatCurrency(data.accumulatedNetSales)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT:</span>
          <span>{formatCurrency(data.accumulatedVat)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Current Shift Sales */}
      <div className="mb-4">
        <div className="font-bold underline">BREAKDOWN OF SALES</div>
        
        {/* Gross Sales */}
        <div className="mb-2">
          <div className="font-bold">GROSS SALES:</div>
          <div className="flex justify-between ml-2">
            <span>VATable Sales:</span>
            <span>{formatCurrency(data.vatSales)}</span>
          </div>
          <div className="flex justify-between ml-2">
            <span>VAT Amount:</span>
            <span>{formatCurrency(data.vatAmount)}</span>
          </div>
          <div className="flex justify-between ml-2">
            <span>VAT Exempt Sales:</span>
            <span>{formatCurrency(data.vatExemptSales)}</span>
          </div>
          <div className="flex justify-between ml-2">
            <span>Zero Rated Sales:</span>
            <span>{formatCurrency(data.zeroRatedSales)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-300">
            <span>GROSS SALES:</span>
            <span>{formatCurrency(data.grossSales)}</span>
          </div>
        </div>

        {/* Discounts */}
        <div className="mb-2">
          <div className="font-bold">DISCOUNTS:</div>
          <div className="flex justify-between ml-2">
            <span>SC Discount:</span>
            <span>{formatCurrency(data.scDiscount)}</span>
          </div>
          <div className="flex justify-between ml-2">
            <span>PWD Discount:</span>
            <span>{formatCurrency(data.pwdDiscount)}</span>
          </div>
          <div className="flex justify-between ml-2">
            <span>NAAC Discount:</span>
            <span>{formatCurrency(data.naacDiscount)}</span>
          </div>
          <div className="flex justify-between ml-2">
            <span>SP Discount:</span>
            <span>{formatCurrency(data.spDiscount)}</span>
          </div>
          <div className="flex justify-between ml-2">
            <span>Other Discount:</span>
            <span>{formatCurrency(data.otherDiscounts)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-300">
            <span>TOTAL DISCOUNT:</span>
            <span>{formatCurrency(data.totalDiscounts)}</span>
          </div>
        </div>

        {/* Net Sales */}
        <div className="mb-2">
          <div className="flex justify-between font-bold text-lg border-t-2 border-gray-400 pt-1">
            <span>NET SALES:</span>
            <span>{formatCurrency(data.netSales)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Footer */}
      <div className="text-center mt-4">
        <div>THIS SERVES AS YOUR</div>
        <div>SALES INVOICE</div>
        <div className="mt-2">
          <div>BIR Permit No. {data.permitNumber || 'N/A'}</div>
          <div>Date Issued: {data.permitNumber ? 'N/A' : 'N/A'}</div>
          <div>Valid Until: {data.permitNumber ? 'N/A' : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}