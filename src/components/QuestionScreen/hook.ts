import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TouchEvent, WheelEvent } from "react";
import {
  getQuestionGlobalIndex,
  questionBlocks,
  totalQuestions,
  totalSteps,
  type CardScrollMode,
  type SelectedAnswerMap,
} from "../../quiz";

type UseQuestionScreenParams = {
  currentStep: number;
  selectedAnswers: SelectedAnswerMap;
  canGoBack: boolean;
  startAtEnd: boolean;
  onBack: () => void;
  onAnswer: (questionIndex: number, choice: 0 | 1) => void;
  onNext: () => void;
};

function useCardScroller() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollAnimationRef = useRef<number | null>(null);

  const scrollToCard = (globalIndex: number, behavior: CardScrollMode) => {
    const scrollElement = scrollRef.current;
    const card = cardRefs.current[globalIndex];

    if (!scrollElement || !card) return;

    const scrollRect = scrollElement.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const left =
      scrollElement.scrollLeft +
      cardRect.left -
      scrollRect.left +
      cardRect.width / 2 -
      scrollElement.clientWidth / 2;
    const top =
      scrollElement.scrollTop +
      cardRect.top -
      scrollRect.top +
      cardRect.height / 2 -
      scrollElement.clientHeight / 2;

    if (scrollAnimationRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    if (behavior !== "custom") {
      scrollElement.scrollTo({ left, top, behavior });
      return;
    }

    const startLeft = scrollElement.scrollLeft;
    const startTop = scrollElement.scrollTop;
    const distanceLeft = left - startLeft;
    const distanceTop = top - startTop;
    const duration = 860;
    const startTime = performance.now();
    const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progressValue = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progressValue);

      scrollElement.scrollTo({
        left: startLeft + distanceLeft * eased,
        top: startTop + distanceTop * eased,
        behavior: "auto",
      });

      if (progressValue < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(animate);
        return;
      }

      scrollAnimationRef.current = null;
    };

    scrollAnimationRef.current = window.requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  return { cardRefs, scrollRef, scrollToCard };
}

export function useQuestionScreen({
  currentStep,
  selectedAnswers,
  canGoBack,
  startAtEnd,
  onBack,
  onAnswer,
  onNext,
}: UseQuestionScreenParams) {
  const [activeGlobalIndex, setActiveGlobalIndex] = useState(0);
  const isAnimatingScrollRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const nextScrollBehaviorRef = useRef<ScrollBehavior | "custom">("auto");
  const { cardRefs, scrollRef, scrollToCard } = useCardScroller();

  const currentQuestionNumber = activeGlobalIndex + 1;
  const progress = (currentQuestionNumber / totalQuestions) * 100;
  const currentBlock = questionBlocks[currentStep];
  const currentBlockStartIndex = getQuestionGlobalIndex(currentStep, 0);

  useEffect(() => {
    setActiveGlobalIndex(
      getQuestionGlobalIndex(
        currentStep,
        startAtEnd ? currentBlock.questions.length - 1 : 0,
      ),
    );
    window.scrollTo({ left: 0, top: window.scrollY });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [currentBlock.questions.length, currentStep, startAtEnd]);

  useLayoutEffect(() => {
    const currentBlockEndIndex =
      currentBlockStartIndex + currentBlock.questions.length - 1;

    if (
      activeGlobalIndex < currentBlockStartIndex ||
      activeGlobalIndex > currentBlockEndIndex
    ) {
      return;
    }

    scrollToCard(activeGlobalIndex, nextScrollBehaviorRef.current);
    nextScrollBehaviorRef.current = "auto";
  }, [
    activeGlobalIndex,
    currentBlock.questions.length,
    currentBlockStartIndex,
    currentStep,
  ]);

  const handleBack = () => {
    if (!canGoBack || currentStep <= 0) {
      onBack();
      return;
    }

    if (isAnimatingScrollRef.current) return;

    const previousStep = currentStep - 1;
    const previousBlock = questionBlocks[previousStep];
    const previousGlobalIndex = getQuestionGlobalIndex(
      previousStep,
      previousBlock.questions.length - 1,
    );
    const currentFirstGlobalIndex = currentBlockStartIndex;

    isAnimatingScrollRef.current = true;
    scrollToCard(currentFirstGlobalIndex, "smooth");

    window.setTimeout(() => {
      scrollToCard(previousGlobalIndex, "custom");

      window.setTimeout(() => {
        isAnimatingScrollRef.current = false;
        onBack();
      }, 880);
    }, 430);
  };

  const moveActiveQuestion = (direction: 1 | -1) => {
    if (isAnimatingScrollRef.current) return;

    setActiveGlobalIndex((globalIndex) => {
      const index = globalIndex - currentBlockStartIndex;
      const minIndex = 0;
      const maxIndex = currentBlock.questions.length - 1;
      const nextIndex = Math.min(
        Math.max(index + direction, minIndex),
        maxIndex,
      );

      if (nextIndex !== index) {
        nextScrollBehaviorRef.current = "smooth";
        isAnimatingScrollRef.current = true;
        window.setTimeout(() => {
          isAnimatingScrollRef.current = false;
        }, 420);
      }

      return currentBlockStartIndex + nextIndex;
    });
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handler = (event: Event) => {
      const wheelEvent = event as unknown as WheelEvent;
      if (Math.abs(wheelEvent.deltaY) < 12) return;
      wheelEvent.preventDefault();
      moveActiveQuestion(wheelEvent.deltaY > 0 ? 1 : -1);
    };

    scrollElement.addEventListener("wheel", handler, { passive: false });
    return () => {
      scrollElement.removeEventListener("wheel", handler);
    };
  }, [currentBlock.questions.length, currentBlockStartIndex]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) return;

    const endY = event.changedTouches[0]?.clientY;
    if (endY === undefined) return;

    const deltaY = touchStartYRef.current - endY;
    touchStartYRef.current = null;

    if (Math.abs(deltaY) < 36) return;
    moveActiveQuestion(deltaY > 0 ? 1 : -1);
  };

  const handleQuestionAnswer = (
    globalIndex: number,
    blockQuestionIndex: number,
    choice: 0 | 1,
  ) => {
    const nextAnswers = { ...selectedAnswers, [globalIndex]: choice };
    const isLastQuestion =
      blockQuestionIndex === currentBlock.questions.length - 1;
    const isBlockComplete = currentBlock.questions.every((_, index) => {
      const questionGlobalIndex = getQuestionGlobalIndex(currentStep, index);
      return nextAnswers[questionGlobalIndex] !== undefined;
    });

    onAnswer(globalIndex, choice);

    if (isLastQuestion && isBlockComplete) {
      const nextBlockIndex = currentStep + 1;
      const nextGlobalIndex =
        nextBlockIndex < totalSteps
          ? getQuestionGlobalIndex(nextBlockIndex, 0)
          : null;

      if (nextGlobalIndex !== null) {
        scrollToCard(nextGlobalIndex, "custom");
      }

      window.setTimeout(() => {
        setActiveGlobalIndex(nextGlobalIndex ?? activeGlobalIndex);
        onNext();
      }, 880);
      return;
    }

    if (isLastQuestion) {
      const firstUnansweredIndex = currentBlock.questions.findIndex(
        (_, index) => {
          const questionGlobalIndex = getQuestionGlobalIndex(
            currentStep,
            index,
          );
          return nextAnswers[questionGlobalIndex] === undefined;
        },
      );

      if (firstUnansweredIndex !== -1) {
        window.setTimeout(() => {
          nextScrollBehaviorRef.current = "smooth";
          setActiveGlobalIndex(currentBlockStartIndex + firstUnansweredIndex);
        }, 120);
      }

      return;
    }

    window.setTimeout(() => moveActiveQuestion(1), 120);
  };

  return {
    cardRefs,
    currentQuestionNumber,
    handleBack,
    handleQuestionAnswer,
    handleTouchEnd,
    handleTouchStart,
    progress,
    scrollRef,
  };
}
