import { attachmentQuestions, faithQuestions } from "./data";
import {
  getAttachmentOptions,
  initialAttachmentScores,
  initialFaithScores,
  scoreAttachmentAnswer,
} from "./scoring";

export type OrderedQuestion =
  | { kind: "attachment"; index: number }
  | { kind: "faith"; index: number };

export type QuestionBlock = {
  title: string;
  questions: OrderedQuestion[];
};

export type AnswerHistoryItem = {
  step: number;
};

export type SelectedAnswerMap = Record<number, 0 | 1>;
export type CardScrollMode = ScrollBehavior | "custom";
export type Screen =
  | "start"
  | "startTransition"
  | "question"
  | "synthesis"
  | "result";

export const startTransitionDurationMs = 1600;
export const synthesisDurationMs = 3600;

const debugQuestionLimit: number | null = null;
const fullQuestionBlocks = buildQuestionBlocks();

export const questionBlocks =
  debugQuestionLimit === null
    ? fullQuestionBlocks
    : trimBlocks(fullQuestionBlocks, debugQuestionLimit);
export const questionOrder = questionBlocks.flatMap((block) => block.questions);
export const totalSteps = questionBlocks.length;
export const totalQuestions = questionOrder.length;

function buildQuestionBlocks(): QuestionBlock[] {
  return [
    {
      title: "愛着スタイル 1",
      questions: attachmentQuestions
        .slice(0, 15)
        .map((_, index) => ({ kind: "attachment", index })),
    },
    {
      title: "信心スタイル",
      questions: faithQuestions
        .slice(0, 5)
        .map((_, index) => ({ kind: "faith", index })),
    },
    {
      title: "愛着スタイル 2",
      questions: attachmentQuestions
        .slice(15, 30)
        .map((_, index) => ({ kind: "attachment", index: index + 15 })),
    },
    {
      title: "人生スタイル",
      questions: faithQuestions
        .slice(5, 10)
        .map((_, index) => ({ kind: "faith", index: index + 5 })),
    },
    {
      title: "愛着スタイル 3",
      questions: attachmentQuestions
        .slice(30, 45)
        .map((_, index) => ({ kind: "attachment", index: index + 30 })),
    },
    {
      title: "関わりスタイル",
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

export function getQuestionGlobalIndex(
  blockIndex: number,
  questionIndex: number,
) {
  let offset = 0;

  for (let index = 0; index < blockIndex; index++) {
    offset += questionBlocks[index].questions.length;
  }

  return offset + questionIndex;
}

export function getQuestionPreview(step: number) {
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

export function calculateScores(answers: SelectedAnswerMap) {
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
