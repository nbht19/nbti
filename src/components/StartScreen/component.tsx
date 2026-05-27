import { Button, Card, Heading, Text } from "@chakra-ui/react";
import "./style.css";

type StartScreenProps = {
  isTransitioning: boolean;
  onStart: () => void;
};

export function StartScreen({ isTransitioning, onStart }: StartScreenProps) {
  return (
    <div className="screen-frame start-screen-frame">
      <Card.Root className="panel start-panel">
        <Card.Body className="panel-body">
          <Text className="eyebrow">Konkokyo Fogel</Text>
          <Heading as="h1">NBTI 診断</Heading>
          <Text className="description">全60問、所要時間は約5〜10分です。</Text>
          <Button
            className="primary-button"
            colorPalette="blue"
            type="button"
            onClick={onStart}
            disabled={isTransitioning}
          >
            診断を開始する
          </Button>
        </Card.Body>
      </Card.Root>
    </div>
  );
}
