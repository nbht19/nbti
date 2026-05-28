import { Button, Text } from "@chakra-ui/react";
import { totalSteps } from "../../quiz";
import "./style.css";

type QuestionHeaderProps = {
  currentBlockNumber: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
};

export function QuestionHeader({
  currentBlockNumber,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: QuestionHeaderProps) {
  return (
    <div className="question-header">
      <div className="step-row">
        <Button
          className="nav-button"
          variant="outline"
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
        >
          前のブロック
        </Button>
        <Text as="span" className="block-count">
          BLOCK {currentBlockNumber} / {totalSteps}
        </Text>
        <Button
          className="nav-button"
          variant="outline"
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
        >
          次のブロック
        </Button>
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
    </div>
  );
}
