import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { attachmentQuestions, faithQuestions } from "./data";
import {
  buildResult,
  getAttachmentOptions,
  initialAttachmentScores,
  initialFaithScores,
  scoreAttachmentAnswer,
} from "./scoring";
import type { AttachmentScores, FaithScores, FaithType } from "./types";

const totalSteps = faithQuestions.length + attachmentQuestions.length;
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

function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [currentStep, setCurrentStep] = useState(0);
  const [faithScores, setFaithScores] =
    useState<FaithScores>(initialFaithScores);
  const [attachmentScores, setAttachmentScores] = useState<AttachmentScores>(
    initialAttachmentScores,
  );
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswerMap>(
    {},
  );
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
        <section className="panel start-panel">
          <p className="eyebrow">Konkokyo Fogel Kinki</p>
          <h1>NBTI 診断</h1>
          <p className="description">
            あなたの「信心のスタイル」と「心の土壌（愛着）」を可視化します。全60問、所要時間は約5〜10分です。
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={startDiagnosis}
          >
            診断を開始する
          </button>
        </section>
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
        <section className="panel result-panel result-enter">
          <p className="eyebrow">Diagnosis Result</p>
          <h1>診断結果</h1>
          <div className="result-code">{result.code}</div>
          <div className="result-details">
            {result.details.map((detail) => (
              <div className="result-item" key={detail.label}>
                <div className="result-label">{detail.label}</div>
                <div>{detail.value}</div>
              </div>
            ))}
          </div>
          <div className="actions">
            <button
              className="primary-button"
              type="button"
              onClick={copyResult}
            >
              結果をコピーする
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={startDiagnosis}
            >
              もう一度受ける
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

type SynthesisScreenProps = {
  selectedAnswers: SelectedAnswerMap;
};

function SynthesisScreen({ selectedAnswers }: SynthesisScreenProps) {
  return (
    <section className="synthesis-stage" aria-live="polite">
      <div className="synthesis-grid" aria-label="回答の統合">
        {Array.from({ length: totalSteps }, (_, step) => {
          const question = getQuestionPreview(step);
          const selectedIndex = selectedAnswers[step];
          const column = step % 6;
          const row = Math.floor(step / 6);
          const distanceFromLast = totalSteps - 1 - step;
          const cardStyle = {
            "--from-x": `${(2.5 - column - distanceFromLast * 1.16) * 118}%`,
            "--from-y": `${(4.5 - row) * 112}%`,
            animationDelay: `${step * 10}ms`,
          } as CSSProperties;

          return (
            <article
              className="mini-card"
              key={step}
              style={cardStyle}
            >
              <div className="mini-card-number">
                {String(step + 1).padStart(2, "0")}
              </div>
              <p>{question?.text}</p>
              <div className="mini-options">
                <span className={selectedIndex === 0 ? "is-selected" : ""} />
                <span className={selectedIndex === 1 ? "is-selected" : ""} />
              </div>
            </article>
          );
        })}
      </div>
      <div className="synthesis-core">
        <div className="synthesis-ring" />
        <div>
          <p className="eyebrow">Integrating</p>
          <h1>集計中</h1>
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

  if (currentStep < faithQuestions.length) {
    const question = faithQuestions[currentStep];

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
          <article
            className="question-card current-card"
            key={`current-${currentStep}`}
          >
            <h2 className="question-text">{question.q}</h2>
            <div className="options">
              <button
                className={selectedIndex === 0 ? "is-selected" : undefined}
                type="button"
                aria-pressed={selectedIndex === 0}
                onClick={() => onFaithAnswer(question.type, "A")}
              >
                {question.a}
              </button>
              <button
                className={selectedIndex === 1 ? "is-selected" : undefined}
                type="button"
                aria-pressed={selectedIndex === 1}
                onClick={() => onFaithAnswer(question.type, "B")}
              >
                {question.b}
              </button>
            </div>
          </article>
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

  const attachmentIndex = currentStep - faithQuestions.length;
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
        <article
          className="question-card current-card"
          key={`current-${currentStep}`}
        >
          <h2 className="question-text">
            {attachmentQuestions[attachmentIndex]}
          </h2>
          <div className="options">
            <button
              className={selectedIndex === 0 ? "is-selected" : undefined}
              type="button"
              aria-pressed={selectedIndex === 0}
              onClick={() => onAttachmentAnswer(attachmentIndex + 1, 1)}
            >
              {firstOption}
            </button>
            <button
              className={selectedIndex === 1 ? "is-selected" : undefined}
              type="button"
              aria-pressed={selectedIndex === 1}
              onClick={() => onAttachmentAnswer(attachmentIndex + 1, 2)}
            >
              {secondOption}
            </button>
          </div>
        </article>
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

  if (step < faithQuestions.length) {
    const question = faithQuestions[step];

    return { text: question.q, options: [question.a, question.b] };
  }

  const attachmentIndex = step - faithQuestions.length;
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

function PreviewCard({
  position,
  text,
  options,
  selectedIndex,
}: PreviewCardProps) {
  return (
    <article
      className={`question-card preview-card ${position}`}
      aria-hidden="true"
    >
      <h2 className="question-text">{text}</h2>
      <div className="options">
        {options.map((option, index) => (
          <button
            className={selectedIndex === index ? "is-selected" : undefined}
            type="button"
            tabIndex={-1}
            key={option}
          >
            {option}
          </button>
        ))}
      </div>
    </article>
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
        <span className="step-count">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>
      <div className="progress-bar" aria-label="診断の進捗">
        <div className="progress-inner" style={{ width: `${progress}%` }} />
      </div>
      <button
        className="back-button"
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
      >
        戻る
      </button>
    </div>
  );
}

export default App;
