"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "cn";

export type CreatableValue = { id: string; name: string };
type Option = { id: string; name: string };

/**
 * A text input with a filtered list underneath. Picking a row selects an existing
 * option (id set); typing something new keeps `id` empty so the caller can create it.
 */
export function CreatableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  id?: string;
  value: CreatableValue;
  onChange: (value: CreatableValue) => void;
  options: Option[];
  placeholder: string;
  required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const query = value.name.trim().toLowerCase();
  const filtered = React.useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(query)).slice(0, 50),
    [options, query],
  );
  const exact = options.find((o) => o.name.toLowerCase() === query);
  const showCreate = query.length >= 2 && !exact;

  React.useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleType(text: string) {
    const match = options.find((o) => o.name.toLowerCase() === text.trim().toLowerCase());
    onChange({ id: match?.id ?? "", name: text });
    setActive(0);
    setOpen(true);
  }

  function pick(option: Option) {
    onChange({ id: option.id, name: option.name });
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && open && filtered[active]) {
      event.preventDefault();
      pick(filtered[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        minLength={2}
        maxLength={100}
        placeholder={placeholder}
        value={value.name}
        className="pr-9"
        onChange={(event) => handleType(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />

      {open && (filtered.length > 0 || showCreate) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
        >
          {filtered.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.id === value.id}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(option)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-2",
                index === active && "bg-accent text-accent-foreground",
                option.id === value.id && "font-semibold",
              )}
            >
              {option.name}
            </li>
          ))}
          {showCreate ? (
            <li className="flex items-center gap-2 border-t px-3 py-2 text-muted-foreground">
              <Plus className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                Not listed? We&apos;ll add &ldquo;{value.name.trim()}&rdquo;
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
