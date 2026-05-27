import { Button, Card, Heading, Stack, Text } from "@chakra-ui/react";
import { ResultDetailCard } from "../ResultDetailCard/component";
import type { ResultDetail } from "../../types";
import "./style.css";

type Result = {
  code: string;
  details: ResultDetail[];
};

type ResultScreenProps = {
  result: Result;
  hasCopiedResult: boolean;
  onCopy: () => void;
  onRestart: () => void;
};

export function ResultScreen({
  result,
  hasCopiedResult,
  onCopy,
  onRestart,
}: ResultScreenProps) {
  return (
    <Card.Root className="panel result-panel result-enter">
      <Card.Body className="panel-body">
        <Text className="eyebrow">Diagnosis Result</Text>
        <Heading as="h1">診断結果</Heading>
        <Text as="div" className="result-code">
          {result.code}
        </Text>
        <Stack className="result-details">
          {result.details.map((detail) => (
            <ResultDetailCard detail={detail} key={detail.label} />
          ))}
        </Stack>
        <Stack className="actions">
          <Button
            className="primary-button"
            colorPalette="blue"
            type="button"
            onClick={onCopy}
          >
            {hasCopiedResult ? "コピーしました！" : "結果をコピーする"}
          </Button>
          <Button
            className="secondary-button"
            variant="outline"
            type="button"
            onClick={onRestart}
          >
            もう一度受ける
          </Button>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
