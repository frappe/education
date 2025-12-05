"use client";
import React, { useState } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { option } from "@/types/form";

interface RHFSelectFieldProps {
  label?: string;
  name: string;
  control: any;
  options: option[];
  placeholder?: string;
  contentClassName?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  searchable?: boolean;
}

const RHFSelectField: React.FC<RHFSelectFieldProps> = ({
  label,
  name,
  control,
  options,
  placeholder,
  contentClassName,
  required = false,
  disabled = false,
  className,
  loading = false,
  searchable = true,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = searchable
    ? options?.filter(
        (opt) =>
          opt.value !== "" &&
          opt.value != null &&
          opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options?.filter((opt) => opt.value !== "" && opt.value != null);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Debug for gender and maritalStatus fields
        if (name === 'personalDetails.gender' || name === 'personalDetails.maritalStatus') {
          console.log(`🔧 SelectField [${name}] - Value:`, field.value, "Type:", typeof field.value);
          console.log(`🔧 SelectField [${name}] - Options:`, options);
        }
        
        return (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                setSearchTerm(""); // Clear search when value is selected
              }}
              value={field.value ? String(field.value) : undefined}
              disabled={disabled}
              onOpenChange={(open) => {
                if (!open) setSearchTerm(""); // Clear search when dropdown closes
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loading ? "Loading..." : placeholder || "Select..."}
                />
              </SelectTrigger>
              <SelectContent className={contentClassName}>
                {searchable && !loading && (
                  <div className="px-2 py-2 border-b">
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                {loading ? (
                  <SelectItem value="__loading" disabled>
                    Loading...
                  </SelectItem>
                ) : filteredOptions && filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))
                ) : searchable && searchTerm ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                    No results found
                  </div>
                ) : null}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}}
    />
  );
};

export default RHFSelectField;
