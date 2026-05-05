import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {SearchFormProps} from "@/types"

export function SearchForm({ value, onChange, onSubmit, isLoading }: SearchFormProps) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Enter competitor name (e.g., Razorpay, Groww)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit(value.trim());
          }
        }}
        disabled={isLoading}
      />
      <Button onClick={() => value.trim() && onSubmit(value.trim())} disabled={isLoading || !value.trim()}>
        {isLoading ? "Searching..." : "Search"}
      </Button>
    </div>
  );
}
