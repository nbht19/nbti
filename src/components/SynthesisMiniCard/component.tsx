import type { CSSProperties } from "react";
import { Card, Text } from "@chakra-ui/react";
import "./style.css";

type SynthesisMiniCardProps = {
  questionNumber: number;
  questionText?: string;
  selectedIndex?: 0 | 1;
  style: CSSProperties;
};

export function SynthesisMiniCard({
  questionNumber,
  questionText,
  selectedIndex,
  style,
}: SynthesisMiniCardProps) {
  return (
    <Card.Root className="mini-card" style={style}>
      <Card.Body className="mini-card-body">
        <Text as="div" className="mini-card-number">
          {String(questionNumber).padStart(2, "0")}
        </Text>
        <Text>{questionText}</Text>
        <div className="mini-options">
          <span className={selectedIndex === 0 ? "is-selected" : ""} />
          <span className={selectedIndex === 1 ? "is-selected" : ""} />
        </div>
      </Card.Body>
    </Card.Root>
  );
}
