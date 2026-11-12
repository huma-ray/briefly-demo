"use client";
// First thing a visitor from the homepage sees (/app → /today?welcome=1): pick the role to look around as.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { setRole } from "@/app/actions/session";
import { useApp } from "@/components/app-state";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Role } from "@/lib/model";

export function RolePicker() {
  const app = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const open = useSearchParams().has("welcome");
  const [pending, startTransition] = useTransition();

  const close = () => router.replace(pathname);
  const pick = (role: Role) =>
    startTransition(async () => {
      if (role !== app.role) await setRole(role);
      close();
    });

  const options: { role: Role; title: string; text: string }[] = [
    { role: "member", title: "Member", text: `Sees only the projects ${app.me.name} belongs to. Watch the assistant hit the access wall on the rest.` },
    { role: "admin", title: "Admin", text: `Sees all ${app.counts.total} projects and can switch the assistant to your own model.` },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="role-pick sm:max-w-[460px]">
        <DialogTitle>How do you want to look around?</DialogTitle>
        <DialogDescription>You&apos;re {app.me.name} in a sample workspace. You can switch any time with View as in the top bar.</DialogDescription>
        <div className="role-opts">
          {options.map((o) => (
            <button key={o.role} type="button" className="role-opt" disabled={pending} aria-current={app.role === o.role || undefined} onClick={() => pick(o.role)}>
              <b>View as {o.title}</b>
              <span>{o.text}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
