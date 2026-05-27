import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import type {
  CSSProperties,
  MutableRefObject,
  TouchEvent,
  WheelEvent,
} from "react";
import {
  Button,
  Card,
  Heading,
  Progress,
  Spacer,
  Stack,
  Text,
} from "@chakra-ui/react";
import { attachmentQuestions, faithQuestions } from "./data";
import {
  buildResult,
  getAttachmentOptions,
  initialAttachmentScores,
  initialFaithScores,
  scoreAttachmentAnswer,
} from "./scoring";
import type { AttachmentScores, FaithScores } from "./types";

type OrderedQuestion =
  | { kind: "attachment"; index: number }
  | { kind: "faith"; index: number };

type QuestionBlock = {
  title: string;
  questions: OrderedQuestion[];
};

const debugQuestionLimit: number | null = null;
const fullQuestionBlocks = buildQuestionBlocks();
const questionBlocks =
  debugQuestionLimit === null
    ? fullQuestionBlocks
    : trimBlocks(fullQuestionBlocks, debugQuestionLimit);
const questionOrder = questionBlocks.flatMap((block) => block.questions);
const totalSteps = questionBlocks.length;
const totalQuestions = questionOrder.length;
const startTransitionDurationMs = 1600;
const synthesisDurationMs = 3600;

type Screen = "start" | "startTransition" | "question" | "synthesis" | "result";

type AnswerHistoryItem = {
  step: number;
};

type SelectedAnswerMap = Record<number, 0 | 1>;
type CardScrollMode = ScrollBehavior | "custom";

function buildQuestionBlocks(): QuestionBlock[] {
  return [
    {
      title: "愛着タイプ 1",
      questions: attachmentQuestions
        .slice(0, 15)
        .map((_, index) => ({ kind: "attachment", index })),
    },
    {
      title: "信心への向き合い方",
      questions: faithQuestions
        .slice(0, 5)
        .map((_, index) => ({ kind: "faith", index })),
    },
    {
      title: "愛着タイプ 2",
      questions: attachmentQuestions
        .slice(15, 30)
        .map((_, index) => ({ kind: "attachment", index: index + 15 })),
    },
    {
      title: "過去の物語",
      questions: faithQuestions
        .slice(5, 10)
        .map((_, index) => ({ kind: "faith", index: index + 5 })),
    },
    {
      title: "愛着タイプ 3",
      questions: attachmentQuestions
        .slice(30, 45)
        .map((_, index) => ({ kind: "attachment", index: index + 30 })),
    },
    {
      title: "人との関わり方",
      questions: faithQuestions
        .slice(10, 15)
        .map((_, index) => ({ kind: "faith", index: index + 10 })),
    },
  ] satisfies QuestionBlock[];
}

function trimBlocks(blocks: QuestionBlock[], limit: number): QuestionBlock[] {
  let remaining = limit;
  const trimmed: QuestionBlock[] = [];

  for (const block of blocks) {
    if (remaining <= 0) break;
    const questions = block.questions.slice(0, remaining);
    trimmed.push({ ...block, questions });
    remaining -= questions.length;
  }

  return trimmed;
}

function getQuestionGlobalIndex(blockIndex: number, questionIndex: number) {
  let offset = 0;

  for (let index = 0; index < blockIndex; index++) {
    offset += questionBlocks[index].questions.length;
  }

  return offset + questionIndex;
}

function calculateScores(answers: SelectedAnswerMap) {
  let nextFaithScores = initialFaithScores();
  let nextAttachmentScores = initialAttachmentScores();

  questionOrder.forEach((question, index) => {
    const answer = answers[index];
    if (answer === undefined) return;

    if (question.kind === "faith") {
      const faithQuestion = faithQuestions[question.index];
      if (answer === 0) {
        nextFaithScores = {
          ...nextFaithScores,
          [faithQuestion.type]: nextFaithScores[faithQuestion.type] + 1,
        };
      }
      return;
    }

    nextAttachmentScores = scoreAttachmentAnswer(
      nextAttachmentScores,
      question.index + 1,
      answer === 0 ? 1 : 2,
    );
  });

  return { nextFaithScores, nextAttachmentScores };
}

function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [currentStep, setCurrentStep] = useState(0);
  const [faithScores, setFaithScores] =
    useState<FaithScores>(initialFaithScores);
  const [attachmentScores, setAttachmentScores] = useState<AttachmentScores>(
    initialAttachmentScores,
  );
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswerMap>({});
  const [startQuestionAtEnd, setStartQuestionAtEnd] = useState(false);
  const synthesisTimerRef = useRef<number | null>(null);
  const startTransitionTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const answerHistoryRef = useRef<AnswerHistoryItem[]>([]);
  const [hasCopiedResult, setHasCopiedResult] = useState(false);
  const result = useMemo(
    () => buildResult(faithScores, attachmentScores),
    [faithScores, attachmentScores],
  );

  const startDiagnosis = (withTransition = true) => {
    if (startTransitionTimerRef.current !== null) {
      window.clearTimeout(startTransitionTimerRef.current);
      startTransitionTimerRef.current = null;
    }

    if (synthesisTimerRef.current !== null) {
      window.clearTimeout(synthesisTimerRef.current);
      synthesisTimerRef.current = null;
    }

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }

    answerHistoryRef.current = [];
    setCurrentStep(0);
    setFaithScores(initialFaithScores());
    setAttachmentScores(initialAttachmentScores());
    setAnswerHistory([]);
    setSelectedAnswers({});
    setStartQuestionAtEnd(false);
    setHasCopiedResult(false);

    if (!withTransition) {
      setScreen("question");
      return;
    }

    setScreen("startTransition");

    startTransitionTimerRef.current = window.setTimeout(() => {
      setScreen("question");
      startTransitionTimerRef.current = null;
    }, startTransitionDurationMs);
  };

  const saveCurrentState = () => {
    const nextHistory = [...answerHistoryRef.current, { step: currentStep }];

    answerHistoryRef.current = nextHistory;
    setAnswerHistory(nextHistory);
  };

  const popPreviousState = () => {
    const previous = answerHistoryRef.current.at(-1);

    if (!previous) {
      return null;
    }

    const nextHistory = answerHistoryRef.current.slice(0, -1);
    answerHistoryRef.current = nextHistory;
    setAnswerHistory(nextHistory);

    return previous;
  };

  const goNext = () => {
    saveCurrentState();
    const next = currentStep + 1;

    if (next >= totalSteps) {
      setScreen("synthesis");

      synthesisTimerRef.current = window.setTimeout(() => {
        setScreen("result");
        synthesisTimerRef.current = null;
      }, synthesisDurationMs);

      return;
    }

    setStartQuestionAtEnd(false);
    setCurrentStep(next);
  };

  const handleAnswer = (questionIndex: number, choice: 0 | 1) => {
    setSelectedAnswers((answers) => {
      const nextAnswers = { ...answers, [questionIndex]: choice };
      const { nextFaithScores, nextAttachmentScores } =
        calculateScores(nextAnswers);

      setFaithScores(nextFaithScores);
      setAttachmentScores(nextAttachmentScores);

      return nextAnswers;
    });
  };

  const goBack = () => {
    const previous = popPreviousState();

    if (!previous) {
      return;
    }

    setStartQuestionAtEnd(true);
    setScreen("question");
    setCurrentStep(previous.step);
  };

  const copyResult = async () => {
    const text = [
      "【NBTI診断結果】",
      `あなたのコード: ${result.code}`,
      "",
      ...result.details.map((detail) => `${detail.label}\n${detail.value}`),
      "#LSC2026 #NBTI #金光教フォーゲル",
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setHasCopiedResult(true);

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }

    copyTimerRef.current = window.setTimeout(() => {
      setHasCopiedResult(false);
      copyTimerRef.current = null;
    }, 3000);
  };

  return (
    <main
      className={`app-shell${
        screen === "start" || screen === "startTransition"
          ? " is-start-screen"
          : ""
      }${screen === "startTransition" ? " is-start-transitioning" : ""}`}
    >
      {(screen === "start" || screen === "startTransition") && (
        <div className="screen-frame start-screen-frame">
          <Card.Root className="panel start-panel">
            <Card.Body className="panel-body">
              <Text className="eyebrow">Konkokyo Fogel</Text>
              <Heading as="h1">NBTI 診断</Heading>
              <Text className="description">
                全60問、所要時間は約5〜10分です。
              </Text>
              <Button
                className="primary-button"
                colorPalette="blue"
                type="button"
                onClick={() => startDiagnosis()}
                disabled={screen === "startTransition"}
              >
                診断を開始する
              </Button>
            </Card.Body>
          </Card.Root>
        </div>
      )}

      {(screen === "question" || screen === "startTransition") && (
        <div className="screen-frame question-screen-frame">
          <QuestionScreen
            currentStep={currentStep}
            selectedAnswers={selectedAnswers}
            canGoBack={answerHistory.length > 0}
            startAtEnd={startQuestionAtEnd}
            onBack={goBack}
            onAnswer={handleAnswer}
            onNext={goNext}
          />
        </div>
      )}
      {screen === "synthesis" && (
        <SynthesisScreen selectedAnswers={selectedAnswers} />
      )}
      {screen === "result" && (
        <Card.Root className="panel result-panel result-enter">
          <Card.Body className="panel-body">
            <Text className="eyebrow">Diagnosis Result</Text>
            <Heading as="h1">診断結果</Heading>
            <Text as="div" className="result-code">
              {result.code}
            </Text>
            <Stack className="result-details">
              {result.details.map((detail) => (
                <Card.Root className="result-item" key={detail.label}>
                  <Card.Body className="result-item-body">
                    <Text as="div" className="result-label">
                      {detail.label}
                    </Text>
                    <Text as="div">{detail.value}</Text>
                  </Card.Body>
                </Card.Root>
              ))}
            </Stack>
            <Stack className="actions">
              <Button
                className="primary-button"
                colorPalette="blue"
                type="button"
                onClick={copyResult}
              >
                {hasCopiedResult ? "コピーしました！" : "結果をコピーする"}
              </Button>
              <Button
                className="secondary-button"
                variant="outline"
                type="button"
                onClick={() => startDiagnosis(false)}
              >
                もう一度受ける
              </Button>
            </Stack>
          </Card.Body>
        </Card.Root>
      )}
    </main>
  );
}

type SynthesisScreenProps = {
  selectedAnswers: SelectedAnswerMap;
};

function SynthesisScreen({ selectedAnswers }: SynthesisScreenProps) {
  const columnCount = 6;
  const rowCount = Math.ceil(totalQuestions / columnCount);
  const centerColumn = (columnCount - 1) / 2;
  const centerRow = (rowCount - 1) / 2;
  const lastQuestionIndex = totalQuestions - 1;

  return (
    <section className="synthesis-stage" aria-live="polite">
      <div className="synthesis-grid" aria-label="回答の統合">
        {Array.from({ length: totalQuestions }, (_, step) => {
          const question = getQuestionPreview(step);
          const selectedIndex = selectedAnswers[step];
          const column = step % columnCount;
          const row = Math.floor(step / columnCount);
          const distanceFromLast = Math.hypot(
            centerColumn - column,
            centerRow - row,
          );
          const cardStyle = {
            "--from-x": `${(centerColumn - column) * 112}%`,
            "--from-y": `${(centerRow - row) * 112}%`,
            "--start-scale": step === lastQuestionIndex ? "4.8" : "1",
            "--mid-scale": step === lastQuestionIndex ? "2.3" : "1",
            "--spread-delay": `${distanceFromLast * 16}ms`,
          } as CSSProperties;

          return (
            <Card.Root className="mini-card" key={step} style={cardStyle}>
              <Card.Body className="mini-card-body">
                <Text as="div" className="mini-card-number">
                  {String(step + 1).padStart(2, "0")}
                </Text>
                <Text>{question?.text}</Text>
                <div className="mini-options">
                  <span className={selectedIndex === 0 ? "is-selected" : ""} />
                  <span className={selectedIndex === 1 ? "is-selected" : ""} />
                </div>
              </Card.Body>
            </Card.Root>
          );
        })}
      </div>
      <div className="synthesis-core">
        <div className="synthesis-ring" />
        <div>
          <Text className="eyebrow">Integrating</Text>
          <Heading as="h1">集計中</Heading>
        </div>
      </div>
    </section>
  );
}

type QuestionScreenProps = {
  currentStep: number;
  selectedAnswers: SelectedAnswerMap;
  canGoBack: boolean;
  startAtEnd: boolean;
  onBack: () => void;
  onAnswer: (questionIndex: number, choice: 0 | 1) => void;
  onNext: () => void;
};

function QuestionScreen({
  currentStep,
  selectedAnswers,
  canGoBack,
  startAtEnd,
  onBack,
  onAnswer,
  onNext,
}: QuestionScreenProps) {
  const [activeGlobalIndex, setActiveGlobalIndex] = useState(0);
  const isAnimatingScrollRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollAnimationRef = useRef<number | null>(null);
  const nextScrollBehaviorRef = useRef<CardScrollMode>("auto");

  const currentQuestionNumber = activeGlobalIndex + 1;
  const progress = (currentQuestionNumber / totalQuestions) * 100;
  const currentBlock = questionBlocks[currentStep];
  const currentBlockStartIndex = getQuestionGlobalIndex(currentStep, 0);

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

  // wheelイベントをpassive: falseで登録し、preventDefaultを有効化
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
          onTouchEnd={handleTouchEnd}
        >
          <div className="blocks-track">
            {questionBlocks.map((block, blockIndex) => (
              <QuestionBlockCards
                block={block}
                blockIndex={blockIndex}
                selectedAnswers={selectedAnswers}
                isActiveBlock={blockIndex === currentStep}
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

function QuestionBlockCards({
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

function getQuestionPreview(step: number) {
  if (step < 0 || step >= totalQuestions) {
    return null;
  }

  const orderedQuestion = questionOrder[step];

  if (orderedQuestion.kind === "faith") {
    const question = faithQuestions[orderedQuestion.index];

    return { text: question.q, options: [question.a, question.b] as const };
  }

  const attachmentIndex = orderedQuestion.index;
  const [firstOption, secondOption] = getAttachmentOptions(attachmentIndex);

  return {
    text: attachmentQuestions[attachmentIndex],
    options: [firstOption, secondOption] as const,
  };
}

type DiagnosisCardProps = {
  className: string;
  questionNumber: number;
  text: string;
  options: readonly [string, string];
  selectedIndex?: 0 | 1;
  onSelect?: (index: 0 | 1) => void;
  ariaHidden?: boolean;
};

const DiagnosisCard = forwardRef<HTMLDivElement, DiagnosisCardProps>(
  function DiagnosisCard(
    {
      className,
      questionNumber,
      text,
      options,
      selectedIndex,
      onSelect,
      ariaHidden = false,
    },
    ref,
  ) {
    // block-scrollの中央にカード本体を揃えるため、flex+align-items:center+min-height:100%を適用
    return (
      <Card.Root
        className={className}
        aria-hidden={ariaHidden}
        ref={ref}
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
        }}
      >
        <Card.Body className="question-card-body" p="0">
          <Text as="div" className="question-number">
            Q{questionNumber}
          </Text>
          <Heading as="h2" className="question-text">
            {text}
          </Heading>
          <div className="options">
            {options.map((option, index) => (
              <Button
                className={[
                  selectedIndex === index ? "is-selected" : "",
                  option.length >= 24 ? "is-long-option" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                colorPalette="blue"
                justifyContent="flex-start"
                minH="54px"
                px="18px"
                py="15px"
                textAlign="left"
                type="button"
                variant={selectedIndex === index ? "solid" : "outline"}
                whiteSpace="normal"
                w="100%"
                aria-pressed={selectedIndex === index}
                key={option}
                tabIndex={onSelect ? undefined : -1}
                onClick={() => onSelect?.(index as 0 | 1)}
              >
                {option}
              </Button>
            ))}
          </div>
        </Card.Body>
      </Card.Root>
    );
  },
);

type QuestionHeaderProps = {
  currentQuestionNumber: number;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
};

function QuestionHeader({
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

export default App;
