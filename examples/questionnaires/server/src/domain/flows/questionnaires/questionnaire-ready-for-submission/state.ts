export type QuestionnaireProgress = {
  questionnaireId: string;
  participantId: string;
  status: 'in_progress' | 'ready_to_submit' | 'submitted';
  currentQuestionId: string | null;
  remainingQuestions: Array<string>;
  answers: Array<{ questionId: string; value: unknown }>;
};
export type QuestionnaireConfig = {};
