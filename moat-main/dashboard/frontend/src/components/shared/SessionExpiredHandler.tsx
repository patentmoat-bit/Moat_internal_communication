"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

export function SessionExpiredHandler() {
  const { user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If the user goes from logged in to not logged in unexpectedly, show the modal
    const hasBeenLoggedIn = localStorage.getItem("user_data") !== null;
    if (hasBeenLoggedIn && !user) {
      setIsOpen(true);
    }
  }, [user]);

  const handleSignIn = () => {
    setIsOpen(false);
    router.push("/auth/login");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Session Expired</DialogTitle>
          <DialogDescription>
            Your session has expired. Please sign in again to continue working. Your unsaved changes have been preserved locally where possible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button onClick={handleSignIn} className="w-full">
            Sign In Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
