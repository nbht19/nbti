import { QuestionBlockCards } from "../QuestionBlockCards/component";
import { QuestionHeader } from "../QuestionHeader/component";
import { useQuestionScreen } from "./hook";
import { questionBlocks, type SelectedAnswerMap } from "../../quiz";
import "./style.css";

type QuestionScreenProps = {
  currentStep: number;
  selectedAnswers: SelectedAnswerMap;
  canGoBack: boolean;
  startAtEnd: boolean;
  onBack: () => void;
  onAnswer: (questionIndex: number, choice: 0 | 1) => void;
  onNext: () => void;
};

export function QuestionScreen(props: QuestionScreenProps) {
  const {
    currentStep,
    selectedAnswers,
    canGoBack,
  } = props;
  const {
    activeGlobalIndex,
    cardRefs,
    currentQuestionNumber,
    handleBack,
    handleQuestionAnswer,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    progress,
    scrollRef,
    transitionTargetIndex,
  } = useQuestionScreen(props);

  return (
    <section className="question-stage">
      <QuestionHeader
        currentQuestionNumber={currentQuestionNumber}
        progress={progress}
        canGoBack={canGoBack}
        onBack={handleBack}
      />
      <div className="question-stack">
        <div
          className="block-scroll"
          ref={scrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="blocks-track">
            {questionBlocks.map((block, blockIndex) => (
              <QuestionBlockCards
                block={block}
                blockIndex={blockIndex}
                selectedAnswers={selectedAnswers}
                isActiveBlock={blockIndex === currentStep}
                activeGlobalIndex={activeGlobalIndex}
                transitionTargetIndex={transitionTargetIndex}
                cardRefs={cardRefs}
                onAnswer={handleQuestionAnswer}
                key={blockIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
