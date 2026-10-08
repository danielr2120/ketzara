import { CheckCircle2 } from "lucide-react";

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
      <CheckCircle2 className="size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
