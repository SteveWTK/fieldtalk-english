"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui";

import { cancelBroadcast } from "../actions";

export function CancelBroadcastButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      loading={pending}
      className="text-danger border-danger/40 hover:bg-danger/5"
      onClick={() => {
        if (
          !window.confirm(
            "Cancelar este broadcast? Envios já feitos não voltam atrás; apenas os pendentes serão marcados como pulados."
          )
        )
          return;
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          await cancelBroadcast(fd);
        });
      }}
    >
      Cancelar broadcast
    </Button>
  );
}
