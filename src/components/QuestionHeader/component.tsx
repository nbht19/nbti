import { Button, Text } from "@chakra-ui/react";
import { totalSteps } from "../../quiz";
import "./style.css";

type QuestionHeaderProps = {
  currentBlockNumber: number;
  canGoBack: boolean;
  onBack: () => void;
};

export function QuestionHeader({
  currentBlockNumber,
  canGoBack,
  onBack,
}: QuestionHeaderProps) {
  return (
    <div className="question-header">
      <div className="step-row">
        <Text as="span" className="block-count">
          BLOCK {currentBlockNumber} / {totalSteps}
        </Text>
      </div>
      <div
        className="block-progress"
        aria-label={`ブロック進捗 ${currentBlockNumber} / ${totalSteps}`}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentBlockNumber}
      >
        {Array.from({ length: totalSteps }).map((_, index) => (
          <span
            className={`block-progress-segment${
              index < currentBlockNumber ? " is-complete" : ""
            }${index + 1 === currentBlockNumber ? " is-current" : ""}`}
            key={index}
          />
        ))}
      </div>
      <Button
        className="back-button"
        variant="outline"
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
      >
        戻る
      </Button>
    </div>
  );
}
