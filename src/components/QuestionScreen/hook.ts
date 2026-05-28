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

const scrollAnimationDurationMs = 860;
const blockBackOverlapMs = 110;

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
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const scrollAnimationRef = useRef<number | null>(null);

  const scrollToCard = (
    globalIndex: number,
    behavior: CardScrollMode,
    onProgress?: (progress: number) => void,
  ) => {
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
      onProgress?.(1);
      return;
    }

    const startLeft = scrollElement.scrollLeft;
    const startTop = scrollElement.scrollTop;
    const distanceLeft = left - startLeft;
    const distanceTop = top - startTop;
    const duration = scrollAnimationDurationMs;
    const startTime = performance.now();
    const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progressValue = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progressValue);

      onProgress?.(eased);

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
  const [visualFocusIndex, setVisualFocusIndex] = useState(0);
  const isAnimatingScrollRef = useRef(false);
  const animationTokenRef = useRef(0);
  const skipNextScrollEffectRef = useRef(false);
  const visualFocusIndexRef = useRef(0);
  const [transitionTargetIndex, setTransitionTargetIndex] = useState<
    number | null
  >(null);
  const touchStartYRef = useRef<number | null>(null);
  const nextScrollBehaviorRef = useRef<ScrollBehavior | "custom">("auto");
  const { cardRefs, scrollRef, scrollToCard } = useCardScroller();

  const currentQuestionNumber = activeGlobalIndex + 1;
  const progress = (currentQuestionNumber / totalQuestions) * 100;
  const currentBlock = questionBlocks[currentStep];
  const currentBlockStartIndex = getQuestionGlobalIndex(currentStep, 0);

  useEffect(() => {
    const nextActiveIndex = getQuestionGlobalIndex(
      currentStep,
      startAtEnd ? currentBlock.questions.length - 1 : 0,
    );
    setActiveGlobalIndex(nextActiveIndex);
    setVisualFocusIndex(nextActiveIndex);
    visualFocusIndexRef.current = nextActiveIndex;
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

    if (skipNextScrollEffectRef.current) {
      skipNextScrollEffectRef.current = false;
      return;
    }

    scrollToCard(activeGlobalIndex, nextScrollBehaviorRef.current);
    setVisualFocusIndex(activeGlobalIndex);
    visualFocusIndexRef.current = activeGlobalIndex;
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
    animateToQuestion(currentFirstGlobalIndex);

    window.setTimeout(() => {
      animateToQuestion(previousGlobalIndex);

      window.setTimeout(() => {
        onBack();
      }, scrollAnimationDurationMs);
    }, scrollAnimationDurationMs - blockBackOverlapMs);
  };

  const animateToQuestion = (globalIndex: number) => {
    const animationToken = animationTokenRef.current + 1;
    animationTokenRef.current = animationToken;
    const startFocusIndex = visualFocusIndexRef.current;
    const focusDistance = globalIndex - startFocusIndex;
    isAnimatingScrollRef.current = true;
    skipNextScrollEffectRef.current = true;
    setTransitionTargetIndex(globalIndex);
    scrollToCard(globalIndex, "custom", (scrollProgress) => {
      const nextVisualFocusIndex =
        startFocusIndex + focusDistance * scrollProgress;

      visualFocusIndexRef.current = nextVisualFocusIndex;
      setVisualFocusIndex(nextVisualFocusIndex);
    });

    window.setTimeout(() => {
      if (animationTokenRef.current !== animationToken) return;
      setActiveGlobalIndex(globalIndex);
      setVisualFocusIndex(globalIndex);
      visualFocusIndexRef.current = globalIndex;
      isAnimatingScrollRef.current = false;
    }, scrollAnimationDurationMs);

    window.setTimeout(() => {
      if (animationTokenRef.current !== animationToken) return;
      setTransitionTargetIndex(null);
    }, scrollAnimationDurationMs + 160);
  };

  const moveActiveQuestion = (direction: 1 | -1) => {
    if (isAnimatingScrollRef.current) return;

    const index = activeGlobalIndex - currentBlockStartIndex;
    const minIndex = 0;
    const maxIndex = currentBlock.questions.length - 1;
    const nextIndex = Math.min(
      Math.max(index + direction, minIndex),
      maxIndex,
    );

    if (nextIndex === index) return;

    animateToQuestion(currentBlockStartIndex + nextIndex);
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
  }, [activeGlobalIndex, currentBlock.questions.length, currentBlockStartIndex]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
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
        animateToQuestion(nextGlobalIndex);
      }

      window.setTimeout(() => {
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
          animateToQuestion(currentBlockStartIndex + firstUnansweredIndex);
        }, 120);
      }

      return;
    }

    window.setTimeout(() => moveActiveQuestion(1), 120);
  };

  return {
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
    visualFocusIndex,
  };
}
