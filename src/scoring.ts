import type { AttachmentScores, FaithScores, ResultDetail } from "./types";

export const initialFaithScores = (): FaithScores => ({ EP: 0, NS: 0, ER: 0 });

export const initialAttachmentScores = (): AttachmentScores => ({
  A: 0,
  B: 0,
  C: 0,
});

export const getAttachmentOptions = (index: number) => {
  const first =
    index === 12
      ? "一人の人を思い続ける"
      : index === 25
        ? "接触を求める"
        : index === 26
          ? "とても重要"
          : index === 35
            ? "好む方だ"
            : index === 36
              ? "よく覚えている"
              : index === 43
                ? "仕事や学業"
                : index === 44
                  ? "とても重要"
                  : "はい";

  const second =
    index === 12
      ? "次の人を求める"
      : index === 25
        ? "接触を求めない"
        : index === 26
          ? "あまり重要でない"
          : index === 35
            ? "あまり好まない"
            : index === 36
              ? "あまり記憶がない"
              : index === 43
                ? "恋愛や対人関係"
                : index === 44
                  ? "あまり重要でない"
                  : "いいえ";

  return [first, second] as const;
};

export const scoreAttachmentAnswer = (
  scores: AttachmentScores,
  qNum: number,
  ansNum: 1 | 2,
): AttachmentScores => {
  const next = { ...scores };

  if (qNum === 1 || qNum === 3 || qNum === 4) {
    if (ansNum === 1) next.A += 1;
  }
  if (qNum === 2) {
    if (ansNum === 1) next.A += 1;
    if (ansNum === 2) next.C += 2;
  }
  if (qNum >= 5 && qNum <= 9) {
    if (ansNum === 2) next.A += 2;
  }
  if (qNum >= 10 && qNum <= 13) {
    if (ansNum === 1) next.A += 1;
    if (ansNum === 2) next.B += 2;
  }
  if (qNum >= 14 && qNum <= 19) {
    if (ansNum === 1) next.B += 1;
  }
  if (qNum === 20 || qNum === 21) {
    if (ansNum === 2) next.B += 2;
  }
  if (qNum >= 22 && qNum <= 25) {
    if (ansNum === 2) next.A += 2;
    if (ansNum === 1) next.B += 1;
  }
  if (qNum === 26 || qNum === 27) {
    if (ansNum === 2) next.C += 2;
  }
  if (qNum >= 28 && qNum <= 35) {
    if (ansNum === 1) next.C += 1;
  }
  if (qNum === 36) {
    if (ansNum === 2) next.C += 2;
  }
  if (qNum === 37) {
    if (ansNum === 2) next.C += 1;
  }
  if (qNum === 38) {
    if (ansNum === 2) next.A += 2;
    if (ansNum === 1) next.B += 1;
  }
  if (qNum === 39 || qNum === 40) {
    if (ansNum === 1) next.A += 1;
    if (ansNum === 2) next.C += 2;
  }
  if (qNum === 41) {
    if (ansNum === 1) next.C += 1;
  }
  if (qNum === 42) {
    if (ansNum === 1) next.B += 1;
    if (ansNum === 2) next.C += 2;
  }
  if (qNum === 43) {
    if (ansNum === 1) next.C += 1;
    if (ansNum === 2) next.B += 2;
  }
  if (qNum === 44) {
    if (ansNum === 1) next.C += 1;
    if (ansNum === 2) next.B += 2;
  }
  if (qNum === 45) {
    if (ansNum === 2) next.C += 2;
  }

  return next;
};

export const buildResult = (
  faithScores: FaithScores,
  attachmentScores: AttachmentScores,
) => {
  const char1 = faithScores.EP >= 3 ? "E" : "P";
  const char2 = faithScores.NS >= 3 ? "N" : "S";
  const char3 = faithScores.ER >= 3 ? "E" : "R";

  const { A, B, C } = attachmentScores;
  let char4 = "S";
  let attachmentLabel = "S（安定型）";

  if (B > A && C > A) {
    char4 = "D";
    attachmentLabel = "D（混乱型）";
  } else if (B >= C && B > A) {
    char4 = "X";
    attachmentLabel = "X（不安型）";
  } else if (C >= B && C > A) {
    char4 = "A";
    attachmentLabel = "A（回避型）";
  }

  const code = `${char4}-${char1}${char2}${char3}`;
  const details: ResultDetail[] = [
    { label: "愛着スタイル", value: attachmentLabel },
    {
      label: "信心スタイル",
      value: char1 === "E" ? "E（委ねる）" : "P（探求する）",
    },
    {
      label: "人生スタイル",
      value: char2 === "N" ? "N（起伏）" : "S（平穏）",
    },
    {
      label: "関わりスタイル",
      value: char3 === "E" ? "E（表現）" : "R（受容）",
    },
  ];

  return { code, details };
};
