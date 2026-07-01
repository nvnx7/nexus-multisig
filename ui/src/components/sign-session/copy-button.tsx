"use client";

import { useState } from "react";
import { Button } from "@chakra-ui/react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="2xs"
      variant="ghost"
      color={copied ? "status.success" : "fg.subtle"}
      px={1}
      minW={0}
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copy"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </Button>
  );
}
