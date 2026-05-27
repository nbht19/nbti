import type { CSSProperties } from "react";
import { Heading, Text } from "@chakra-ui/react";
import { SynthesisMiniCard } from "../SynthesisMiniCard/component";
import {
  getQuestionPreview,
  totalQuestions,
  type SelectedAnswerMap,
} from "../../quiz";
import "./style.css";

type SynthesisScreenProps = {
  selectedAnswers: SelectedAnswerMap;
};

export function SynthesisScreen({ selectedAnswers }: SynthesisScreenProps) {
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
            <SynthesisMiniCard
              questionNumber={step + 1}
              questionText={question?.text}
              selectedIndex={selectedIndex}
              style={cardStyle}
              key={step}
            />
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
