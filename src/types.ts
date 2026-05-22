export type FaithType = 'EP' | 'NS' | 'ER';

export type FaithQuestion = {
  q: string;
  a: string;
  b: string;
  type: FaithType;
};

export type FaithScores = Record<FaithType, number>;

export type AttachmentScores = {
  A: number;
  B: number;
  C: number;
};

export type ResultDetail = {
  label: string;
  value: string;
};
