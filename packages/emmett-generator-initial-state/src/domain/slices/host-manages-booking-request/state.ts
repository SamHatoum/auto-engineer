export type WorkflowState =
    | { status: 'Initial' }
    | {
    status: 'Completed';
    hostId: string;
    notifiedAt: string;
};

export const initialWorkflowState = (): WorkflowState => ({
    status: 'Initial'
});