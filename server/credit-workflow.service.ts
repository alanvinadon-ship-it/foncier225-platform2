/**
 * Credit Workflow Service
 * Manages state transitions and workflow logic for credit files
 */

import { TRPCError } from "@trpc/server";
import {
  CreditFileStatus,
  CreditWorkflowEvent,
  VALID_TRANSITIONS,
  NEXT_STATUS_BY_EVENT,
} from "@shared/credit-types";

export class CreditWorkflowService {
  /**
   * Check if a transition is valid
   */
  static canTransition(currentStatus: CreditFileStatus, event: CreditWorkflowEvent): boolean {
    const validEvents = VALID_TRANSITIONS[currentStatus];
    return validEvents.includes(event);
  }

  /**
   * Get the next status for a given event
   */
  static getNextStatus(
    currentStatus: CreditFileStatus,
    event: CreditWorkflowEvent
  ): CreditFileStatus | null {
    const nextStatusMap = NEXT_STATUS_BY_EVENT[currentStatus];
    if (!nextStatusMap) return null;
    return nextStatusMap[event] ?? null;
  }

  /**
   * Assert that a transition is valid, throw if not
   */
  static assertTransition(currentStatus: CreditFileStatus, event: CreditWorkflowEvent): void {
    if (!this.canTransition(currentStatus, event)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot transition from ${currentStatus} with event ${event}`,
      });
    }
  }

  /**
   * Apply a transition and return the new status
   */
  static applyTransition(
    currentStatus: CreditFileStatus,
    event: CreditWorkflowEvent
  ): CreditFileStatus {
    this.assertTransition(currentStatus, event);
    const nextStatus = this.getNextStatus(currentStatus, event);
    if (!nextStatus) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `No next status found for transition from ${currentStatus} with event ${event}`,
      });
    }
    return nextStatus;
  }

  /**
   * Get all valid events for a given status
   */
  static getValidEvents(status: CreditFileStatus): CreditWorkflowEvent[] {
    return VALID_TRANSITIONS[status] ?? [];
  }

  /**
   * Check if a status is terminal (no further transitions possible)
   */
  static isTerminal(status: CreditFileStatus): boolean {
    const validEvents = VALID_TRANSITIONS[status];
    return !validEvents || validEvents.length === 0;
  }

  /**
   * Check if a status is a success state
   */
  static isSuccess(status: CreditFileStatus): boolean {
    return status === CreditFileStatus.APPROVED;
  }

  /**
   * Check if a status is a failure state
   */
  static isFailure(status: CreditFileStatus): boolean {
    return status === CreditFileStatus.REJECTED || status === CreditFileStatus.CLOSED;
  }

  /**
   * Check if a status is pending (awaiting action)
   */
  static isPending(status: CreditFileStatus): boolean {
    return (
      status === CreditFileStatus.DRAFT ||
      status === CreditFileStatus.DOCS_PENDING ||
      status === CreditFileStatus.SUBMITTED ||
      status === CreditFileStatus.UNDER_REVIEW ||
      status === CreditFileStatus.OFFERED ||
      status === CreditFileStatus.ACCEPTED
    );
  }
}
