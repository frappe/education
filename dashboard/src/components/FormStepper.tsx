import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Step {
  label: string;
  icon: LucideIcon;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function FormStepper({ steps, currentStep, onStepClick }: FormStepperProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;
          const Icon = step.icon;

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => onStepClick(stepNumber)}
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all hover-elevate",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground shadow-md",
                    isPending && "bg-background border-border text-muted-foreground"
                  )}
                  aria-label={`${step.label}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                  data-testid={`step-${stepNumber}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </button>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isActive && "text-foreground",
                      (isCompleted || isPending) && "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={cn(
                      "h-0.5 transition-colors",
                      stepNumber < currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
