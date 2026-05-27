import { Button, Progress, Text } from "@chakra-ui/react";
import { totalQuestions } from "../../quiz";
import "./style.css";

type QuestionHeaderProps = {
  currentQuestionNumber: number;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
};

export function QuestionHeader({
  currentQuestionNumber,
  progress,
  canGoBack,
  onBack,
}: QuestionHeaderProps) {
  return (
    <div className="question-header">
      <div className="step-row">
        <Text as="span" className="step-count">
          {currentQuestionNumber} / {totalQuestions}
        </Text>
      </div>
      <Progress.Root
        className="progress-bar"
        aria-label="診断の進捗"
        value={progress}
      >
        <Progress.Track className="progress-track">
          <Progress.Range className="progress-inner" />
        </Progress.Track>
      </Progress.Root>
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
