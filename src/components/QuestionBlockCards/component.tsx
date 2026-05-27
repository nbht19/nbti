import type { MutableRefObject } from "react";
import { DiagnosisCard } from "../DiagnosisCard/component";
import {
  getQuestionGlobalIndex,
  getQuestionPreview,
  questionBlocks,
  type QuestionBlock,
  type SelectedAnswerMap,
} from "../../quiz";
import "./style.css";

type QuestionBlockCardsProps = {
  block: QuestionBlock;
  blockIndex: number;
  selectedAnswers: SelectedAnswerMap;
  isActiveBlock: boolean;
  cardRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  onAnswer: (
    globalIndex: number,
    blockQuestionIndex: number,
    choice: 0 | 1,
  ) => void;
};

export function QuestionBlockCards({
  block,
  blockIndex,
  selectedAnswers,
  isActiveBlock,
  cardRefs,
  onAnswer,
}: QuestionBlockCardsProps) {
  const previousQuestionCount = questionBlocks
    .slice(0, blockIndex)
    .reduce(
      (count, previousBlock) => count + previousBlock.questions.length,
      0,
    );
  const leadingGhostCardCount = Math.max(previousQuestionCount - blockIndex, 0);

  return (
    <div className="question-block-column">
      <div className="ghost-card start-ghost-card" aria-hidden="true" />
      {Array.from({ length: leadingGhostCardCount }).map((_, index) => (
        <div
          className="ghost-card block-ghost-card"
          aria-hidden="true"
          key={`leading-ghost-${blockIndex}-${index}`}
        />
      ))}
      {block.questions.map((_, index) => {
        const globalIndex = getQuestionGlobalIndex(blockIndex, index);
        const preview = getQuestionPreview(globalIndex);
        const selectedIndex = selectedAnswers[globalIndex];
        if (!preview) return null;

        return (
          <article
            className="block-card current-card"
            key={globalIndex}
            aria-hidden={!isActiveBlock}
          >
            <div
              className="block-question-card"
              ref={(el) => {
                cardRefs.current[globalIndex] = el;
              }}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <DiagnosisCard
                className="question-card-inner"
                questionNumber={globalIndex + 1}
                text={preview.text}
                options={preview.options}
                selectedIndex={selectedIndex}
                onSelect={
                  isActiveBlock
                    ? (choice) => onAnswer(globalIndex, index, choice)
                    : undefined
                }
                ariaHidden={!isActiveBlock}
              />
            </div>
          </article>
        );
      })}
      <div className="ghost-card block-ghost-card" aria-hidden="true" />
    </div>
  );
}
