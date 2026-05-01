"use client";

import { CalendarIcon, ClockIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  combineDateAndTimeValues,
  formatDateTimeInputValue,
  formatPickerDate,
  formatPickerDateTime,
  formatTimeInputValue,
  jsDateToPlainDateString,
  plainDateToJsDate,
  todayString,
} from "@/lib/temporal";
import { cn } from "@/lib/utils";

function parseDateValue(value: string) {
  if (!value) return undefined;
  return plainDateToJsDate(value);
}

function parseDateTimeValue(value: string) {
  if (!value) return undefined;
  const dateOnlyValue = value.split("T")[0]?.split(" ")[0] ?? "";
  return plainDateToJsDate(dateOnlyValue);
}

function formatDateValue(date: Date | undefined) {
  if (!date) return "";
  return jsDateToPlainDateString(date);
}

type DatePickerFieldProps = {
  className?: string;
  defaultOpen?: boolean;
  id?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function DatePickerField({
  className,
  defaultOpen: initialOpen = false,
  id,
  onBlur,
  onChange,
  placeholder = "Pick a date",
  value,
}: DatePickerFieldProps) {
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(initialOpen);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            id={id}
            variant="outline"
            data-empty={!selectedDate}
            className={cn(
              "w-full justify-start px-2.5 font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {selectedDate ? formatPickerDate(value) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(formatDateValue(date));
            onBlur?.();
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type DateTimePickerFieldProps = {
  className?: string;
  id?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function DateTimePickerField({
  className,
  id,
  onBlur,
  onChange,
  placeholder = "Pick date and time",
  value,
}: DateTimePickerFieldProps) {
  const selectedDate = parseDateTimeValue(value);
  const selectedTime = useMemo(() => formatTimeInputValue(value), [value]);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            id={id}
            variant="outline"
            data-empty={!selectedDate}
            className={cn(
              "w-full justify-start px-2.5 font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {selectedDate ? formatPickerDateTime(value) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col">
          <Calendar
            captionLayout="dropdown"
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) {
                onChange("");
                onBlur?.();
                return;
              }

              onChange(combineDateAndTimeValues(jsDateToPlainDateString(date), selectedTime));
              onBlur?.();
            }}
          />
          <div className="border-t p-3">
            <Field>
              <FieldLabel htmlFor={id ? `${id}-time` : undefined}>Time</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id={id ? `${id}-time` : undefined}
                  type="time"
                  value={selectedTime}
                  onChange={(event) => {
                    const baseDate = value
                      ? formatDateTimeInputValue(value).split("T")[0]
                      : todayString();
                    onChange(combineDateAndTimeValues(baseDate, event.target.value));
                  }}
                  onBlur={onBlur}
                  className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <InputGroupAddon align="inline-end">
                  <ClockIcon />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
