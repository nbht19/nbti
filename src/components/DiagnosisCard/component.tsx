import { forwardRef } from "react";
import { Card, Heading, Text } from "@chakra-ui/react";
import { AnswerOptionButton } from "../AnswerOptionButton/component";
import "./style.css";

type DiagnosisCardProps = {
  className: string;
  questionNumber: number;
  text: string;
  options: readonly [string, string];
  selectedIndex?: 0 | 1;
  onSelect?: (index: 0 | 1) => void;
  ariaHidden?: boolean;
};

export const DiagnosisCard = forwardRef<HTMLDivElement, DiagnosisCardProps>(
  function DiagnosisCard(
    {
      className,
      questionNumber,
      text,
      options,
      selectedIndex,
      onSelect,
      ariaHidden = false,
    },
    ref,
  ) {
    return (
      <Card.Root
        className={className}
        aria-hidden={ariaHidden}
        ref={ref}
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
        }}
      >
        <Card.Body className="question-card-body" p="0">
          <Text as="div" className="question-number">
            Q{questionNumber}
          </Text>
          <Heading as="h2" className="question-text">
            {text}
          </Heading>
          <div className="options">
            {options.map((option, index) => (
              <AnswerOptionButton
                key={option}
                option={option}
                isSelected={selectedIndex === index}
                onSelect={
                  onSelect ? () => onSelect(index as 0 | 1) : undefined
                }
              />
            ))}
          </div>
        </Card.Body>
      </Card.Root>
    );
  },
);
