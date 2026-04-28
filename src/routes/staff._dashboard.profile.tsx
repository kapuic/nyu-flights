import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { formatPhoneNumberIntl } from "react-phone-number-input";

import { StaffPhoneNumbersSheet } from "@/components/staff-phone-numbers-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InlineField } from "@/components/ui/inline-field";
import {
  getStaffProfileFn,
  replaceOwnStaffPhoneNumbersFn,
  updateStaffProfileFieldFn,
} from "@/lib/queries";
import { getStaffPermission } from "@/lib/staff-permissions";
import { formatPlainDate } from "@/lib/temporal";

function staffProfileQueryOptions() {
  return {
    queryKey: ["staff-profile"] as const,
    queryFn: () => getStaffProfileFn(),
    staleTime: 30_000,
  };
}

export const Route = createFileRoute("/staff/_dashboard/profile")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffProfileQueryOptions());
  },
  component: StaffProfilePage,
});

function getRoleLabel(permission: string) {
  if (permission === "superadmin") return "Superadmin";
  if (permission === "admin") return "Admin";
  return "Staff";
}

function SettingsSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:gap-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div>{children}</div>
      </div>
      <Separator />
    </>
  );
}

function StaffProfilePage() {
  const { data: profile } = useSuspenseQuery(staffProfileQueryOptions());
  const router = useRouter();
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [phoneSheetDraft, setPhoneSheetDraft] = useState<Array<string>>([]);
  const [savingPhones, setSavingPhones] = useState(false);

  const permission = getStaffPermission(profile.username);

  const refreshProfile = useCallback(async () => {
    await router.invalidate();
  }, [router]);

  const saveField = useCallback(
    async (field: "email" | "firstName" | "lastName", value: string) => {
      const result = await updateStaffProfileFieldFn({ data: { field, value } });
      if ("error" in result && typeof result.error === "string" && result.error) {
        throw new Error(result.error);
      }
      toast.success(result.message);
      await refreshProfile();
    },
    [refreshProfile],
  );

  const openPhoneSheet = useCallback(() => {
    setPhoneSheetDraft(profile.phoneNumbers.length ? profile.phoneNumbers : [""]);
    setPhoneSheetOpen(true);
  }, [profile.phoneNumbers]);

  const savePhoneNumbers = useCallback(async () => {
    if (savingPhones) return;
    setSavingPhones(true);
    try {
      const result = await replaceOwnStaffPhoneNumbersFn({
        data: { phoneNumbers: phoneSheetDraft },
      });
      if ("error" in result && typeof result.error === "string" && result.error) {
        throw new Error(result.error);
      }
      toast.success(result.message);
      setPhoneSheetOpen(false);
      setPhoneSheetDraft([]);
      await refreshProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update phone numbers.");
    } finally {
      setSavingPhones(false);
    }
  }, [phoneSheetDraft, refreshProfile, savingPhones]);

  const V = "filled" as const;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information</p>
      </div>

      <SettingsSection title="Account" description="Your account details. These cannot be changed.">
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <InlineField variant={V} label="Username" value={profile.username} readOnly />
            <InlineField variant={V} label="Airline" value={profile.airlineName} readOnly />
            <div className="group space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Role</span>
              <div className="flex min-h-8 items-center px-2.5 py-1">
                <Badge variant="secondary" className="text-xs capitalize">
                  {getRoleLabel(permission)}
                </Badge>
              </div>
            </div>
            <InlineField
              variant={V}
              label="Date of Birth"
              value={profile.dateOfBirth ? formatPlainDate(profile.dateOfBirth) : ""}
              readOnly
            />
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        title="Personal Information"
        description="Edit your name and contact details."
      >
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <InlineField
              variant={V}
              label="First Name"
              value={profile.firstName}
              onSave={(v) => saveField("firstName", v)}
            />
            <InlineField
              variant={V}
              label="Last Name"
              value={profile.lastName}
              onSave={(v) => saveField("lastName", v)}
            />
            <InlineField
              variant={V}
              label="Email"
              value={profile.email}
              onSave={(v) => saveField("email", v)}
            />
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection title="Phone Numbers" description="Manage your staff phone numbers.">
        <Card>
          <CardContent className="pt-6">
            {profile.phoneNumbers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {profile.phoneNumbers.map((phone: string, index: number) => (
                  <div key={phone} className="flex min-h-8 items-center px-2.5 py-1 text-sm">
                    <span>
                      {formatPhoneNumberIntl(phone) || phone}
                      {index === 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground">Primary</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-2.5 py-1 text-sm italic text-muted-foreground">
                No phone numbers added.
              </p>
            )}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={openPhoneSheet}>
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>
      </SettingsSection>

      <StaffPhoneNumbersSheet
        description="Manage your phone numbers."
        onOpenChange={setPhoneSheetOpen}
        onPhoneNumbersChange={setPhoneSheetDraft}
        onSave={savePhoneNumbers}
        open={phoneSheetOpen}
        phoneNumbers={phoneSheetDraft}
        saving={savingPhones}
        title="Phone numbers"
      />
    </div>
  );
}
