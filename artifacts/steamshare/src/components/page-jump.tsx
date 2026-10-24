import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PageJumpProps {
  value: string;
  maxPage: number;
  ariaLabel: string;
  onChange: (value: string) => void;
  onGo: (page: number) => void;
}

export function PageJump({
  value,
  maxPage,
  ariaLabel,
  onChange,
  onGo,
}: PageJumpProps) {
  return (
    <form
      className="flex shrink-0 items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const page = Number(value);
        if (Number.isInteger(page) && page >= 1) onGo(page);
      }}
    >
      <Input
        type="number"
        min={1}
        max={maxPage}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-14 shrink-0 px-1 text-center"
        aria-label={ariaLabel}
        placeholder="Page"
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="h-8 w-8 shrink-0 px-1"
      >
        Go
      </Button>
    </form>
  );
}
