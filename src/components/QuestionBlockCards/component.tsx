import type { CSSProperties, MutableRefObject } from "react";
import { DiagnosisCard } from "../DiagnosisCard/component";
import {
  getQuestionGlobalIndex,
  getQuestionPreview,
  questionBlocks,
  totalQuestions,
  totalSteps,
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
  onSynthesis: () => void;
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
  onSynthesis,
}: QuestionBlockCardsProps) {
  const previousQuestionCount = questionBlocks
    .slice(0, blockIndex)
    .reduce(
      (count, previousBlock) => count + previousBlock.questions.length,
      0,
    );
  const leadingGhostCardCount = Math.max(previousQuestionCount - blockIndex, 0);
  const isLastBlock = blockIndex === totalSteps - 1;
  const isLastBlockComplete =
    isLastBlock &&
    block.questions.every((_, index) => {
      const globalIndex = getQuestionGlobalIndex(blockIndex, index);

      return selectedAnswers[globalIndex] !== undefined;
    });

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
        const relativePosition = Math.max(-2, Math.min(2, rawRelativePosition));
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
                  isActiveBlock && globalIndex === activeGlobalIndex
                    ? (choice) => onAnswer(globalIndex, index, choice)
                    : undefined
                }
                ariaHidden={!isActiveBlock}
              />
            </div>
          </article>
        );
      })}
      {isLastBlock && (
        <article
          className={`block-card current-card synthesis-action-card${
            activeGlobalIndex === totalQuestions
              ? " is-active-question"
              : " is-after-question"
          }${
            isLastBlockComplete ||
            activeGlobalIndex === totalQuestions ||
            transitionTargetIndex === totalQuestions
              ? ""
              : " is-hidden-block-card"
          }`}
          style={
            {
              "--card-offset": Math.max(
                -2,
                Math.min(2, totalQuestions - activeGlobalIndex),
              ),
              "--card-depth": Math.abs(totalQuestions - activeGlobalIndex),
              "--card-scale":
                1 - 0.075 * Math.abs(totalQuestions - activeGlobalIndex),
            } as CSSProperties
          }
          aria-hidden={!isActiveBlock}
          ref={(el) => {
            cardRefs.current[totalQuestions] = el;
          }}
        >
          <div
            className="block-question-card synthesis-action-card-inner"
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2 className="synthesis-card-title">すべての回答が揃いました</h2>
            <p className="synthesis-card-text">
              60枚のカードを集計して、診断結果を表示します。
            </p>
            <button
              className="synthesis-card-button"
              type="button"
              onClick={onSynthesis}
              disabled={activeGlobalIndex !== totalQuestions}
            >
              集計する
            </button>
          </div>
        </article>
      )}
      <div className="ghost-card block-ghost-card" aria-hidden="true" />
    </div>
  );
}
