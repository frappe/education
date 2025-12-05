"use client";
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface RHFTextareaProps {
  label?: string;
  name: string;
  control: any;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const RHFTextarea: React.FC<RHFTextareaProps> = ({
  label,
  name,
  control,
  placeholder,
  rows = 3,
  readOnly = false,
  required = false,
  disabled = false,
  className,
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}{" "}
              {required && <span className="text-red-500">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Textarea
              {...field}
              placeholder={placeholder}
              rows={rows}
              readOnly={readOnly}
              disabled={disabled}
              className={`resize-none ${
                readOnly ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default RHFTextarea;
