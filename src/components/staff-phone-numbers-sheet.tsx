import { Plus, Trash2 } from "lucide-react";
import type { Value as PhoneValue } from "react-phone-number-input";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type StaffPhoneNumbersSheetProps = {
  description: string;
  onOpenChange: (open: boolean) => void;
  onPhoneNumbersChange: (phoneNumbers: Array<string>) => void;
  onSave?: () => Promise<void> | void;
  open: boolean;
  phoneNumbers: Array<string>;
  saving?: boolean;
  title: string;
};

function normalizePhoneRows(phoneNumbers: Array<string>) {
  const rows = phoneNumbers.length ? phoneNumbers : [""];
  return rows.map((phoneNumber) => phoneNumber.trim());
}

export function StaffPhoneNumbersSheet({
  description,
  onOpenChange,
  onPhoneNumbersChange,
  onSave,
  open,
  phoneNumbers,
  saving = false,
  title,
}: StaffPhoneNumbersSheetProps) {
  const rows = normalizePhoneRows(phoneNumbers);

  function updatePhoneNumber(index: number, value: string) {
    const nextRows = [...rows];
    nextRows[index] = value;
    onPhoneNumbersChange(nextRows);
  }

  function addPhoneNumber() {
    onPhoneNumbersChange([...rows, ""]);
  }

  function removePhoneNumber(index: number) {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    onPhoneNumbersChange(nextRows.length ? nextRows : [""]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <FieldGroup>
            {rows.map((phoneNumber, index) => (
              <Field key={index}>
                <FieldLabel htmlFor={`staff-phone-${index}`}>
                  {index === 0 ? "Primary phone" : `Phone ${index + 1}`}
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <PhoneInput
                    className="flex-1"
                    defaultCountry="US"
                    id={`staff-phone-${index}`}
                    onChange={(value: PhoneValue) => updatePhoneNumber(index, value ?? "")}
                    placeholder="(555) 000-0000"
                    value={phoneNumber as PhoneValue}
                  />
                  {rows.length > 1 ? (
                    <Button
                      aria-label={`Remove phone ${index + 1}`}
                      disabled={saving}
                      onClick={() => removePhoneNumber(index)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              </Field>
            ))}
            <Button
              className="w-fit"
              disabled={saving}
              onClick={addPhoneNumber}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus data-icon="inline-start" />
              Add phone number
            </Button>
            <FieldDescription>Blank rows are ignored when saved.</FieldDescription>
          </FieldGroup>
        </div>
        {onSave ? (
          <SheetFooter>
            <Button disabled={saving} onClick={() => void onSave()} type="button">
              {saving ? "Saving…" : "Save phone numbers"}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
