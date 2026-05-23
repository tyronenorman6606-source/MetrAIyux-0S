export class MetrAIyuxError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'MetrAIyuxError';
    this.code = code;
    this.details = details;
  }
}

export class AuthError extends MetrAIyuxError {
  constructor(message, details = null) {
    super(message, 'AUTH_FAILED', details);
    this.name = 'AuthError';
  }
}

export class PlanLimitError extends MetrAIyuxError {
  constructor(message, limit, details = null) {
    super(message, 'PLAN_LIMIT', details);
    this.name = 'PlanLimitError';
    this.limit = limit;
  }
}

export class ApprovalRequiredError extends MetrAIyuxError {
  constructor(message, commandId, route) {
    super(message, 'APPROVAL_REQUIRED', { command_id: commandId, route });
    this.name = 'ApprovalRequiredError';
    this.command_id = commandId;
    this.route = route;
  }
}
