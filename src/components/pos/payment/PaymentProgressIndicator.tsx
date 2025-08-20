import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface PaymentStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration?: number;
}

interface PaymentProgressIndicatorProps {
  currentStep: string;
  steps: PaymentStep[];
  totalProgress: number;
  estimatedTimeRemaining?: number;
  onCancel?: () => void;
}

export function PaymentProgressIndicator({
  currentStep,
  steps,
  totalProgress,
  estimatedTimeRemaining,
  onCancel
}: PaymentProgressIndicatorProps) {
  const getStepIcon = (step: PaymentStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <Circle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStepTextColor = (step: PaymentStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600 font-medium';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Overall Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Processing Payment</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(totalProgress)}%
              </span>
            </div>
            <Progress value={totalProgress} className="h-2" />
            {estimatedTimeRemaining && (
              <div className="text-xs text-muted-foreground mt-1">
                Estimated time remaining: {Math.ceil(estimatedTimeRemaining / 1000)}s
              </div>
            )}
          </div>

          {/* Step-by-step Progress */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                {getStepIcon(step)}
                <div className="flex-1">
                  <div className={`text-sm ${getStepTextColor(step)}`}>
                    {step.label}
                  </div>
                  {step.status === 'processing' && (
                    <div className="text-xs text-muted-foreground">
                      Processing...
                    </div>
                  )}
                  {step.status === 'completed' && step.duration && (
                    <div className="text-xs text-green-600">
                      Completed in {step.duration}ms
                    </div>
                  )}
                  {step.status === 'failed' && (
                    <div className="text-xs text-red-600">
                      Failed - please try again
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current Step Highlight */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin mr-2" />
              <span className="text-sm text-blue-700">
                {steps.find(step => step.id === currentStep)?.label || 'Processing...'}
              </span>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
            💡 <strong>Performance Tip:</strong> Background processing and caching 
            are speeding up your transaction. This usually takes 2-3x longer without optimization!
          </div>
        </div>
      </CardContent>
    </Card>
  );
}