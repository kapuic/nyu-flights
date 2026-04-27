"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginFormFields } from "@/components/login-form"
import { SignupFormFields } from "@/components/signup-form"

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>
            Sign in or create an account to complete your booking.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <LoginFormFields
              heading="Sign in to book"
              description="We need to verify your identity before securing these seats."
              onSuccess={onSuccess}
              footer={<></>}
            />
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <SignupFormFields
              onSuccess={onSuccess}
              footer={<></>}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
