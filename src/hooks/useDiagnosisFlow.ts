import { useMemo, useRef, useState } from "react";
import {
  calculateScores,
  startTransitionDurationMs,
  synthesisDurationMs,
  totalSteps,
  type AnswerHistoryItem,
  type Screen,
  type SelectedAnswerMap,
} from "../quiz";
import {
  buildResult,
  initialAttachmentScores,
  initialFaithScores,
} from "../scoring";
import type { AttachmentScores, FaithScores } from "../types";

export function useDiagnosisFlow() {
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

  return {
    answerHistory,
    copyResult,
    currentStep,
    goBack,
    goNext,
    handleAnswer,
    hasCopiedResult,
    result,
    screen,
    selectedAnswers,
    startDiagnosis,
    startQuestionAtEnd,
  };
}
