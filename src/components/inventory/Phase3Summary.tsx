import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Network, BarChart3 } from "lucide-react";

export const Phase3Summary = () => {
  const phase3Features = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Advanced Analytics Engine",
      description: "Real-time sync trend analysis, predictive insights, and performance metrics",
      status: "Active"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Workflow Automation Engine", 
      description: "Automated repair rules, failure pattern detection, and preventive maintenance",
      status: "Active"
    },
    {
      icon: <Network className="h-5 w-5" />,
      title: "Multi-Store Orchestrator",
      description: "Cross-store sync coordination, health-based load balancing, and cluster management", 
      status: "Active"
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-6 w-6 text-green-500" />
        <h3 className="text-lg font-semibold">Phase 3: Advanced Inventory Intelligence</h3>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Advanced analytics, automation, and multi-store coordination system is now fully operational.
      </p>

      <div className="grid gap-4">
        {phase3Features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="text-primary mt-1">
              {feature.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{feature.title}</h4>
                <Badge variant="secondary" className="text-xs">
                  {feature.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-800 dark:text-green-200">Phase 3 Complete</span>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300">
          Your inventory sync system now features enterprise-grade intelligence with automated 
          monitoring, predictive analytics, and multi-store orchestration capabilities.
        </p>
      </div>
    </Card>
  );
};