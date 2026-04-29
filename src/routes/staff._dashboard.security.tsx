import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { changeStaffPasswordFn } from "@/lib/queries";
import { changePasswordFormSchema } from "@/lib/schemas";

export const Route = createFileRoute("/staff/_dashboard/security")({
  component: StaffSecurityPage,
});

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

function StaffSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = changePasswordFormSchema.safeParse({
      confirmPassword,
      currentPassword,
      newPassword,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const result = await changeStaffPasswordFn({
        data: {
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        },
      });
      if ("error" in result && result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed to change password.");
        return;
      }
      toast.success("Password changed.");
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3">
      <div>
        <h1 className="text-lg font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground">Manage your password</p>
      </div>

      <SettingsSection
        title="Change Password"
        description="Enter your current password and choose a new one."
      >
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors.currentPassword)}>
                  <FieldLabel htmlFor="staff-current-password">Current Password</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldErrors.currentPassword)}
                    autoComplete="current-password"
                    disabled={saving}
                    id="staff-current-password"
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    type="password"
                    value={currentPassword}
                  />
                  {fieldErrors.currentPassword ? (
                    <FieldError errors={[{ message: fieldErrors.currentPassword }]} />
                  ) : null}
                </Field>
                <Field data-invalid={Boolean(fieldErrors.newPassword)}>
                  <FieldLabel htmlFor="staff-new-password">New Password</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldErrors.newPassword)}
                    autoComplete="new-password"
                    disabled={saving}
                    id="staff-new-password"
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    type="password"
                    value={newPassword}
                  />
                  {fieldErrors.newPassword ? (
                    <FieldError errors={[{ message: fieldErrors.newPassword }]} />
                  ) : null}
                </Field>
                <Field data-invalid={Boolean(fieldErrors.confirmPassword)}>
                  <FieldLabel htmlFor="staff-confirm-password">Confirm New Password</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    autoComplete="new-password"
                    disabled={saving}
                    id="staff-confirm-password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    type="password"
                    value={confirmPassword}
                  />
                  {fieldErrors.confirmPassword ? (
                    <FieldError errors={[{ message: fieldErrors.confirmPassword }]} />
                  ) : null}
                </Field>
                {error ? (
                  <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                <Button disabled={saving} type="submit">
                  {saving ? "Changing…" : "Change Password"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  );
}
