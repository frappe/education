"use client";
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

interface RHFCheckboxProps {
  label?: string;
  name: string;
  control: any;
  disabled?: boolean;
  required?: boolean;
}

const RHFCheckbox: React.FC<RHFCheckboxProps> = ({
  label,
  name,
  control,
  disabled = false,
  required = false, 
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            {label && (
              <FormLabel className="text-sm font-medium cursor-pointer">
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
            )}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
};

export default RHFCheckbox;
