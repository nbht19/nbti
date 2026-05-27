import { Card, Text } from "@chakra-ui/react";
import type { ResultDetail } from "../../types";
import "./style.css";

type ResultDetailCardProps = {
  detail: ResultDetail;
};

export function ResultDetailCard({ detail }: ResultDetailCardProps) {
  return (
    <Card.Root className="result-item">
      <Card.Body className="result-item-body">
        <Text as="div" className="result-label">
          {detail.label}
        </Text>
        <Text as="div">{detail.value}</Text>
      </Card.Body>
    </Card.Root>
  );
}
