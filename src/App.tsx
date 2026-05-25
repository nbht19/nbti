import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Button, Card, Heading, Progress, Stack, Text } from "@chakra-ui/react";
import { attachmentQuestions, faithQuestions } from "./data";
import {
  buildResult,
  getAttachmentOptions,
  initialAttachmentScores,
  initialFaithScores,
  scoreAttachmentAnswer,
} from "./scoring";
import type { AttachmentScores, FaithScores, FaithType } from "./types";

type OrderedQuestion =
  | { kind: "attachment"; index: number }
  | { kind: "faith"; index: number };

const debugQuestionLimit: number | null = 3;
const fullQuestionOrder = buildQuestionOrder();
const questionOrder =
  debugQuestionLimit === null
    ? fullQuestionOrder
    : fullQuestionOrder.slice(0, debugQuestionLimit);
const totalSteps = questionOrder.length;
const slideDurationMs = 900;
const synthesisDurationMs = 3600;

type Screen = "start" | "question" | "synthesis" | "result";

type AnswerHistoryItem = {
  step: number;
  faithScores: FaithScores;
  attachmentScores: AttachmentScores;
};

type SlideDirection = "forward" | "back";
type SelectedAnswerMap = Record<number, 0 | 1>;

function buildQuestionOrder(): OrderedQuestion[] {
  const order: OrderedQuestion[] = [];

  for (let group = 0; group < faithQuestions.length; group++) {
    for (let offset = 0; offset < 3; offset++) {
      order.push({ kind: "attachment", index: group * 3 + offset });
    }

    order.push({ kind: "faith", index: group });
  }

  return order;
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
  const [slideDirection, setSlideDirection] =
    useState<SlideDirection>("forward");
  const [isSliding, setIsSliding] = useState(false);
  const slideTimerRef = useRef<number | null>(null);
  const synthesisTimerRef = useRef<number | null>(null);
  const answerHistoryRef = useRef<AnswerHistoryItem[]>([]);
  const result = useMemo(
    () => buildResult(faithScores, attachmentScores),
    [faithScores, attachmentScores],
  );

  const startDiagnosis = () => {
    if (slideTimerRef.current !== null) {
      window.clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }

    if (synthesisTimerRef.current !== null) {
      window.clearTimeout(synthesisTimerRef.current);
      synthesisTimerRef.current = null;
    }

    answerHistoryRef.current = [];
    setScreen("question");
    setCurrentStep(0);
    setFaithScores(initialFaithScores());
    setAttachmentScores(initialAttachmentScores());
    setAnswerHistory([]);
    setSelectedAnswers({});
    setIsSliding(false);
  };

  const saveCurrentState = () => {
    const nextHistory = [
      ...answerHistoryRef.current,
      { step: currentStep, faithScores, attachmentScores },
    ];

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

  const startSlideAnimation = () => {
    if (slideTimerRef.current !== null) {
      window.clearTimeout(slideTimerRef.current);
    }

    setIsSliding(true);

    slideTimerRef.current = window.setTimeout(() => {
      setIsSliding(false);
      slideTimerRef.current = null;
    }, slideDurationMs);
  };

  const goNext = (
    nextFaithScores: FaithScores,
    nextAttachmentScores: AttachmentScores,
  ) => {
    const next = currentStep + 1;

    if (next >= totalSteps) {
      setFaithScores(nextFaithScores);
      setAttachmentScores(nextAttachmentScores);
      setScreen("synthesis");

      synthesisTimerRef.current = window.setTimeout(() => {
        setScreen("result");
        synthesisTimerRef.current = null;
      }, synthesisDurationMs);

      return;
    }

    setSlideDirection("forward");
    setFaithScores(nextFaithScores);
    setAttachmentScores(nextAttachmentScores);
    setCurrentStep(next);
    startSlideAnimation();
  };

  const handleFaith = (type: FaithType, choice: "A" | "B") => {
    saveCurrentState();
    setSelectedAnswers((answers) => ({
      ...answers,
      [currentStep]: choice === "A" ? 0 : 1,
    }));

    const nextFaithScores = { ...faithScores };

    if (choice === "A") {
      nextFaithScores[type] += 1;
    }

    goNext(nextFaithScores, attachmentScores);
  };

  const handleAttachment = (questionNumber: number, answerNumber: 1 | 2) => {
    saveCurrentState();
    setSelectedAnswers((answers) => ({
      ...answers,
      [currentStep]: answerNumber === 1 ? 0 : 1,
    }));

    const nextAttachmentScores = scoreAttachmentAnswer(
      attachmentScores,
      questionNumber,
      answerNumber,
    );

    goNext(faithScores, nextAttachmentScores);
  };

  const goBack = () => {
    const previous = popPreviousState();

    if (!previous) {
      return;
    }

    startBackSlide(previous);
  };

  const startBackSlide = (previous: AnswerHistoryItem) => {
    setSlideDirection("back");
    setScreen("question");
    setCurrentStep(previous.step);
    setFaithScores(previous.faithScores);
    setAttachmentScores(previous.attachmentScores);
    startSlideAnimation();
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
    window.alert("結果をクリップボードにコピーしました！");
  };

  return (
    <main className="app-shell">
      {screen === "start" && (
        <Card.Root className="panel start-panel">
          <Card.Body className="panel-body">
            <Text className="eyebrow">Konkokyo Fogel Kinki</Text>
            <Heading as="h1">NBTI 診断</Heading>
            <Text className="description">
              全60問、所要時間は約5〜10分です。
            </Text>
            <Button
              className="primary-button"
              colorPalette="blue"
              type="button"
              onClick={startDiagnosis}
            >
              診断を開始する
            </Button>
          </Card.Body>
        </Card.Root>
      )}

      {screen === "question" && (
        <QuestionScreen
          currentStep={currentStep}
          selectedAnswers={selectedAnswers}
          canGoBack={answerHistory.length > 0}
          slideDirection={slideDirection}
          isSliding={isSliding}
          onBack={goBack}
          onFaithAnswer={handleFaith}
          onAttachmentAnswer={handleAttachment}
        />
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
                結果をコピーする
              </Button>
              <Button
                className="secondary-button"
                variant="outline"
                type="button"
                onClick={startDiagnosis}
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
  const rowCenter = (Math.ceil(totalSteps / columnCount) - 1) / 2;

  return (
    <section className="synthesis-stage" aria-live="polite">
      <div className="synthesis-grid" aria-label="回答の統合">
        {Array.from({ length: totalSteps }, (_, step) => {
          const question = getQuestionPreview(step);
          const selectedIndex = selectedAnswers[step];
          const column = step % columnCount;
          const row = Math.floor(step / columnCount);
          const distanceFromLast = totalSteps - 1 - step;
          const cardStyle = {
            "--from-x": `${(2.5 - column - distanceFromLast * 1.22) * 118}%`,
            "--from-y": `${(rowCenter - row) * 112}%`,
            "--row-delay": `${Math.max(0, 140 - distanceFromLast * 2)}ms`,
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
  slideDirection: SlideDirection;
  isSliding: boolean;
  onBack: () => void;
  onFaithAnswer: (type: FaithType, choice: "A" | "B") => void;
  onAttachmentAnswer: (questionNumber: number, answerNumber: 1 | 2) => void;
};

function QuestionScreen({
  currentStep,
  selectedAnswers,
  canGoBack,
  slideDirection,
  isSliding,
  onBack,
  onFaithAnswer,
  onAttachmentAnswer,
}: QuestionScreenProps) {
  const progress = (currentStep / totalSteps) * 100;
  const previousQuestion = getQuestionPreview(currentStep - 1);
  const nextQuestion = getQuestionPreview(currentStep + 1);
  const selectedIndex = selectedAnswers[currentStep];
  const currentQuestion = questionOrder[currentStep];

  if (currentQuestion.kind === "faith") {
    const question = faithQuestions[currentQuestion.index];

    return (
      <section className="question-stage">
        <QuestionHeader
          currentStep={currentStep}
          progress={progress}
          canGoBack={canGoBack}
          onBack={onBack}
        />
        <div
          className={`question-stack is-${slideDirection}${isSliding ? " is-sliding" : ""}`}
        >
          {previousQuestion && (
            <PreviewCard
              key={`previous-${currentStep - 1}`}
              position="previous"
              text={previousQuestion.text}
              options={previousQuestion.options}
              selectedIndex={selectedAnswers[currentStep - 1]}
            />
          )}
          <DiagnosisCard
            className="question-card current-card"
            key={`current-${currentStep}`}
            text={question.q}
            options={[question.a, question.b]}
            selectedIndex={selectedIndex}
            onSelect={(index) =>
              onFaithAnswer(question.type, index === 0 ? "A" : "B")
            }
          />
          {nextQuestion && (
            <PreviewCard
              key={`next-${currentStep + 1}`}
              position="next"
              text={nextQuestion.text}
              options={nextQuestion.options}
              selectedIndex={selectedAnswers[currentStep + 1]}
            />
          )}
        </div>
      </section>
    );
  }

  const attachmentIndex = currentQuestion.index;
  const [firstOption, secondOption] = getAttachmentOptions(attachmentIndex);

  return (
    <section className="question-stage">
      <QuestionHeader
        currentStep={currentStep}
        progress={progress}
        canGoBack={canGoBack}
        onBack={onBack}
      />
      <div
        className={`question-stack is-${slideDirection}${isSliding ? " is-sliding" : ""}`}
      >
        {previousQuestion && (
          <PreviewCard
            key={`previous-${currentStep - 1}`}
            position="previous"
            text={previousQuestion.text}
            options={previousQuestion.options}
            selectedIndex={selectedAnswers[currentStep - 1]}
          />
        )}
        <DiagnosisCard
          className="question-card current-card"
          key={`current-${currentStep}`}
          text={attachmentQuestions[attachmentIndex]}
          options={[firstOption, secondOption]}
          selectedIndex={selectedIndex}
          onSelect={(index) =>
            onAttachmentAnswer(attachmentIndex + 1, index === 0 ? 1 : 2)
          }
        />
        {nextQuestion && (
          <PreviewCard
            key={`next-${currentStep + 1}`}
            position="next"
            text={nextQuestion.text}
            options={nextQuestion.options}
            selectedIndex={selectedAnswers[currentStep + 1]}
          />
        )}
      </div>
    </section>
  );
}

function getQuestionPreview(step: number) {
  if (step < 0 || step >= totalSteps) {
    return null;
  }

  const orderedQuestion = questionOrder[step];

  if (orderedQuestion.kind === "faith") {
    const question = faithQuestions[orderedQuestion.index];

    return { text: question.q, options: [question.a, question.b] };
  }

  const attachmentIndex = orderedQuestion.index;
  const [firstOption, secondOption] = getAttachmentOptions(attachmentIndex);

  return {
    text: attachmentQuestions[attachmentIndex],
    options: [firstOption, secondOption],
  };
}

type PreviewCardProps = {
  position: "previous" | "next";
  text: string;
  options: string[];
  selectedIndex?: 0 | 1;
};

type DiagnosisCardProps = {
  className: string;
  text: string;
  options: string[];
  selectedIndex?: 0 | 1;
  onSelect?: (index: 0 | 1) => void;
  ariaHidden?: boolean;
};

function DiagnosisCard({
  className,
  text,
  options,
  selectedIndex,
  onSelect,
  ariaHidden = false,
}: DiagnosisCardProps) {
  return (
    <Card.Root className={className} aria-hidden={ariaHidden}>
      <Card.Body className="question-card-body" p="0">
        <Heading as="h2" className="question-text">
          {text}
        </Heading>
        <div className="options">
          {options.map((option, index) => (
            <Button
              className={selectedIndex === index ? "is-selected" : undefined}
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
}

function PreviewCard({
  position,
  text,
  options,
  selectedIndex,
}: PreviewCardProps) {
  return (
    <DiagnosisCard
      className={`question-card preview-card ${position}`}
      text={text}
      options={options}
      selectedIndex={selectedIndex}
      ariaHidden
    />
  );
}

type QuestionHeaderProps = {
  currentStep: number;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
};

function QuestionHeader({
  currentStep,
  progress,
  canGoBack,
  onBack,
}: QuestionHeaderProps) {
  return (
    <div className="question-header">
      <div className="step-row">
        <Text as="span" className="step-count">
          {currentStep + 1} / {totalSteps}
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
