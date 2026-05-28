import { QuestionScreen } from "./components/QuestionScreen/component";
import { RandomTheme } from "./components/RandomTheme/component";
import { ResultScreen } from "./components/ResultScreen/component";
import { StartScreen } from "./components/StartScreen/component";
import { SynthesisScreen } from "./components/SynthesisScreen/component";
import { useDiagnosisFlow } from "./hooks/useDiagnosisFlow";
import "./App.css";

function App() {
  const {
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
  } = useDiagnosisFlow();

  return (
    <main
      className={`app-shell${
        screen === "start" || screen === "startTransition"
          ? " is-start-screen"
          : ""
      }${screen === "startTransition" ? " is-start-transitioning" : ""}`}
    >
      <RandomTheme />

      {(screen === "start" || screen === "startTransition") && (
        <StartScreen
          isTransitioning={screen === "startTransition"}
          onStart={() => startDiagnosis()}
        />
      )}

      {(screen === "question" || screen === "startTransition") && (
        <div className="screen-frame question-screen-frame">
          <QuestionScreen
            currentStep={currentStep}
            selectedAnswers={selectedAnswers}
            canGoBack={answerHistory.length > 0}
            startAtEnd={startQuestionAtEnd}
            onBack={goBack}
            onAnswer={handleAnswer}
            onNext={goNext}
          />
        </div>
      )}

      {screen === "synthesis" && (
        <SynthesisScreen selectedAnswers={selectedAnswers} />
      )}

      {screen === "result" && (
        <ResultScreen
          result={result}
          hasCopiedResult={hasCopiedResult}
          onCopy={copyResult}
          onRestart={() => startDiagnosis(false)}
        />
      )}
    </main>
  );
}

export default App;
