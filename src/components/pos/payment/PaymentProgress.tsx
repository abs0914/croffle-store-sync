import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface PaymentProgressProps {
  isVisible: boolean;
  stage: 'validation' | 'inventory' | 'payment' | 'complete';
  progress: number;
  message: string;
  estimatedTime?: number;
}

export default function PaymentProgress({ 
  isVisible, 
  stage, 
  progress, 
  message, 
  estimatedTime 
}: PaymentProgressProps) {
  if (!isVisible) return null;

  const getStageIcon = () => {
    switch (stage) {
      case 'validation':
        return '🔍';
      case 'inventory':
        return '📦';
      case 'payment':
        return '💳';
      case 'complete':
        return '✅';
      default:
        return '🔄';
    }
  };

  const getStageTitle = () => {
    switch (stage) {
      case 'validation':
        return 'Validating Products';
      case 'inventory':
        return 'Processing Inventory';
      case 'payment':
        return 'Processing Payment';
      case 'complete':
        return 'Transaction Complete';
      default:
        return 'Processing';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{getStageIcon()}</div>
          <h3 className="text-lg font-semibold text-gray-900">{getStageTitle()}</h3>
          <p className="text-sm text-gray-600 mt-1">{message}</p>
        </div>
        
        <div className="space-y-4">
          <Progress value={progress} className="w-full h-2" />
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>{Math.round(progress)}% complete</span>
            {estimatedTime && (
              <span>~{Math.ceil(estimatedTime / 1000)}s remaining</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center mt-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Please wait...</span>
        </div>
      </div>
    </div>
  );
}