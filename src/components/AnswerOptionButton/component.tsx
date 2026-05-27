import { Button } from "@chakra-ui/react";
import "./style.css";

type AnswerOptionButtonProps = {
  option: string;
  isSelected: boolean;
  onSelect?: () => void;
};

export function AnswerOptionButton({
  option,
  isSelected,
  onSelect,
}: AnswerOptionButtonProps) {
  return (
    <Button
      className={[
        isSelected ? "is-selected" : "",
        option.length >= 24 ? "is-long-option" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      colorPalette="blue"
      justifyContent="flex-start"
      minH="54px"
      px="18px"
      py="15px"
      textAlign="left"
      type="button"
      variant={isSelected ? "solid" : "outline"}
      whiteSpace="normal"
      w="100%"
      aria-pressed={isSelected}
      tabIndex={onSelect ? undefined : -1}
      onClick={onSelect}
    >
      {option}
    </Button>
  );
}
