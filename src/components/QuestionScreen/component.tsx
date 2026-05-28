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
    canGoNextBlockDirectly,
    cardRefs,
    handleBack,
    handleStartSynthesis,
    handleGoNextBlock,
    handleQuestionAnswer,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    scrollRef,
    transitionTargetIndex,
  } = useQuestionScreen(props);

  return (
    <section className="question-stage">
      <QuestionHeader
        currentBlockNumber={currentStep + 1}
        canGoBack={canGoBack}
        canGoForward={canGoNextBlockDirectly}
        onBack={handleBack}
        onForward={handleGoNextBlock}
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
                onSynthesis={handleStartSynthesis}
                key={blockIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
