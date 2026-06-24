import { Box, Flex, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Step {
  /** Label shown beneath the step indicator. */
  label: string;
  /** Content rendered in the panel when this step is active. */
  content: ReactNode;
}

interface StepperProps {
  steps: Step[];
  /** 1-based index of the currently active step. */
  currentStep: number;
}

// ── Step indicator bar ────────────────────────────────────────────────────────

function StepIndicator({
  num,
  done,
  active,
  label,
}: {
  num: number;
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <Flex direction="column" align="center" gap={2} w={20}>
      {/* Circle */}
      <Flex
        w={8}
        h={8}
        rounded="full"
        align="center"
        justify="center"
        fontSize="xs"
        fontWeight="semibold"
        transition="all 0.25s"
        bg={done || active ? "brand.solid" : "bg.muted"}
        color={done || active ? "fg.onPrimary" : "fg.subtle"}
        borderWidth={1}
        borderColor={done || active ? "brand.solid" : "border.default"}
        outline={active ? "3px solid" : undefined}
        outlineColor={active ? "brand.subtle" : undefined}
        outlineOffset="2px"
      >
        {done ? <Check size={13} strokeWidth={2.5} /> : num}
      </Flex>
      {/* Label */}
      <Text
        fontSize="xs"
        textAlign="center"
        lineHeight="tight"
        fontFamily="body"
        letterSpacing="tight"
        color={active ? "fg.default" : "fg.subtle"}
        fontWeight={active ? "medium" : "normal"}
        transition="color 0.2s"
        whiteSpace="nowrap"
      >
        {label}
      </Text>
    </Flex>
  );
}

// ── Connector line ────────────────────────────────────────────────────────────

function Connector({ done }: { done: boolean }) {
  return (
    <Box
      h="1px"
      flex={1}
      minW={6}
      mx={1}
      mt="15px" // aligns with circle center (circle is h=32px → 16px from top, label gap 2 → ~4px, total ~15px from indicator flex-start)
      flexShrink={0}
      transition="background-color 0.25s"
      bg={done ? "brand.solid" : "border.default"}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Stepper({ steps, currentStep }: StepperProps) {
  const activeStep = steps[currentStep - 1];

  return (
    <Flex direction="column" gap={8}>
      {/* ── Indicator bar ── */}
      <Flex align="flex-start" justify="center">
        {steps.map((step, idx) => {
          const num = idx + 1;
          const done = num < currentStep;
          const active = num === currentStep;

          return (
            <Flex key={step.label} align="flex-start" flex={idx < steps.length - 1 ? 1 : undefined}>
              <StepIndicator num={num} done={done} active={active} label={step.label} />
              {idx < steps.length - 1 && <Connector done={done} />}
            </Flex>
          );
        })}
      </Flex>

      {/* ── Active step content panel ── */}
      {activeStep && (
        <Box
          bg="bg.default"
          rounded="xl"
          borderWidth={1}
          borderColor="border.default"
          p={8}
          boxShadow="shadow.surface"
        >
          {activeStep.content}
        </Box>
      )}
    </Flex>
  );
}
