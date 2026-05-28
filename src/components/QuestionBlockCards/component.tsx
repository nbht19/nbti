import type { CSSProperties, MutableRefObject } from "react";
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
  activeGlobalIndex: number;
  transitionTargetIndex: number | null;
  cardRefs: MutableRefObject<Array<HTMLElement | null>>;
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
  activeGlobalIndex,
  transitionTargetIndex,
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
        const rawRelativePosition = globalIndex - activeGlobalIndex;
        const relativePosition = Math.max(
          -2,
          Math.min(2, rawRelativePosition),
        );
        const isActiveQuestion = Math.abs(rawRelativePosition) < 0.001;
        const isStoredActiveQuestion = globalIndex === activeGlobalIndex;
        const isTransitionTarget = globalIndex === transitionTargetIndex;
        const shouldShowCard =
          isActiveBlock || isStoredActiveQuestion || isTransitionTarget;
        const cardDepth = Math.abs(relativePosition);
        const cardScale = 1 - 0.075 * cardDepth;
        if (!preview) return null;

        return (
          <article
            className={`block-card current-card ${
              isActiveQuestion
                ? "is-active-question"
                : relativePosition < 0
                  ? "is-before-question"
                  : "is-after-question"
            }${shouldShowCard ? "" : " is-hidden-block-card"}`}
            style={
              {
                "--card-offset": relativePosition,
                "--card-depth": cardDepth,
                "--card-scale": cardScale,
              } as CSSProperties
            }
            key={globalIndex}
            aria-hidden={!isActiveBlock}
            ref={(el) => {
              cardRefs.current[globalIndex] = el;
            }}
          >
            <div
              className="block-question-card"
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
