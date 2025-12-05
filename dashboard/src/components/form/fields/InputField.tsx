"use client";
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface RHFInputFieldProps {
  label?: string | undefined;
  name: string;
  control: any;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
}

const RHFInputField: React.FC<RHFInputFieldProps> = ({
  label,
  name,
  control,
  type = "text",
  placeholder,
  readOnly = false,
  required = false,
  min,
  max,
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              autoComplete="off"
              min={min}
              max={max}
              readOnly={readOnly}
              className={readOnly ? "bg-gray-100 cursor-not-allowed" : ""}
              onChange={(e) => {
                if (type === "number") {
                  const value = e.target.value;
                  field.onChange(value === "" ? "" : value);
                } else {
                  field.onChange(e.target.value);
                }
              }}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default RHFInputField;
