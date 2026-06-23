import { relations } from "drizzle-orm/relations";
import { users, agentAvailabilities, appointments, parcels, attestations, creditFiles, creditDecisions, documents, verifyTokens, bankMandates, citizenNotifications, conversations, creditDocuments, creditFileParticipants, creditOffers, creditRequests, erpAccountingPreEntries, erpInvoices, erpInvoiceLines, erpProjects, erpVendors, erpContractors, erpMilestones, erpNotifications, erpOverrunAlerts, erpPayments, erpPerformanceRatings, erpRoles, erpRolePermissions, erpPermissions, erpSafetyAudits, erpSafetyIncidents, erpTasks, erpTaskDependencies, erpUserProfiles, erpUserRoles, generatedDocuments, landTitleApplications, villageTerritories, landTitleDocuments, landTitleSteps, landTitleOppositions, messages, notaryBaskets, notificationPreferences, payments, roles, rolePermissions, permissions, systemConfig, territoryBoundaryPoints, territoryDocuments, territoryStatusHistory, urbanAcdApplications, urbanAcdDocuments, urbanAcdSteps, urbanAcdOppositions, urbanParcelDetails, userInvitations, userRoles } from "./schema";

export const agentAvailabilitiesRelations = relations(agentAvailabilities, ({one}) => ({
	user: one(users, {
		fields: [agentAvailabilities.agentId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	agentAvailabilities: many(agentAvailabilities),
	appointments_citizenId: many(appointments, {
		relationName: "appointments_citizenId_users_id"
	}),
	appointments_agentId: many(appointments, {
		relationName: "appointments_agentId_users_id"
	}),
	attestations: many(attestations),
	bankMandates_bankId: many(bankMandates, {
		relationName: "bankMandates_bankId_users_id"
	}),
	bankMandates_citizenId: many(bankMandates, {
		relationName: "bankMandates_citizenId_users_id"
	}),
	citizenNotifications: many(citizenNotifications),
	conversations_citizenId: many(conversations, {
		relationName: "conversations_citizenId_users_id"
	}),
	conversations_agentId: many(conversations, {
		relationName: "conversations_agentId_users_id"
	}),
	creditDecisions: many(creditDecisions),
	creditDocuments: many(creditDocuments),
	creditFileParticipants: many(creditFileParticipants),
	creditFiles: many(creditFiles),
	creditOffers_bankId: many(creditOffers, {
		relationName: "creditOffers_bankId_users_id"
	}),
	creditOffers_createdByUserId: many(creditOffers, {
		relationName: "creditOffers_createdByUserId_users_id"
	}),
	creditRequests: many(creditRequests),
	documents_ownerId: many(documents, {
		relationName: "documents_ownerId_users_id"
	}),
	documents_createdById: many(documents, {
		relationName: "documents_createdById_users_id"
	}),
	erpAccountingPreEntries_createdBy: many(erpAccountingPreEntries, {
		relationName: "erpAccountingPreEntries_createdBy_users_id"
	}),
	erpAccountingPreEntries_validatedBy: many(erpAccountingPreEntries, {
		relationName: "erpAccountingPreEntries_validatedBy_users_id"
	}),
	erpInvoices_submittedBy: many(erpInvoices, {
		relationName: "erpInvoices_submittedBy_users_id"
	}),
	erpInvoices_approvedBy: many(erpInvoices, {
		relationName: "erpInvoices_approvedBy_users_id"
	}),
	erpInvoices_rejectedBy: many(erpInvoices, {
		relationName: "erpInvoices_rejectedBy_users_id"
	}),
	erpInvoices_createdBy: many(erpInvoices, {
		relationName: "erpInvoices_createdBy_users_id"
	}),
	erpMilestones: many(erpMilestones),
	erpNotifications: many(erpNotifications),
	erpOverrunAlerts: many(erpOverrunAlerts),
	erpPayments: many(erpPayments),
	erpPerformanceRatings: many(erpPerformanceRatings),
	erpSafetyAudits: many(erpSafetyAudits),
	erpSafetyIncidents_reportedBy: many(erpSafetyIncidents, {
		relationName: "erpSafetyIncidents_reportedBy_users_id"
	}),
	erpSafetyIncidents_assignedTo: many(erpSafetyIncidents, {
		relationName: "erpSafetyIncidents_assignedTo_users_id"
	}),
	erpSafetyIncidents_resolvedBy: many(erpSafetyIncidents, {
		relationName: "erpSafetyIncidents_resolvedBy_users_id"
	}),
	erpSafetyIncidents_closedBy: many(erpSafetyIncidents, {
		relationName: "erpSafetyIncidents_closedBy_users_id"
	}),
	erpUserProfiles: many(erpUserProfiles),
	erpUserRoles_userId: many(erpUserRoles, {
		relationName: "erpUserRoles_userId_users_id"
	}),
	erpUserRoles_assignedBy: many(erpUserRoles, {
		relationName: "erpUserRoles_assignedBy_users_id"
	}),
	generatedDocuments: many(generatedDocuments),
	landTitleApplications: many(landTitleApplications),
	landTitleDocuments_uploadedBy: many(landTitleDocuments, {
		relationName: "landTitleDocuments_uploadedBy_users_id"
	}),
	landTitleDocuments_verifiedBy: many(landTitleDocuments, {
		relationName: "landTitleDocuments_verifiedBy_users_id"
	}),
	landTitleOppositions: many(landTitleOppositions),
	landTitleSteps: many(landTitleSteps),
	messages: many(messages),
	notaryBaskets: many(notaryBaskets),
	notificationPreferences: many(notificationPreferences),
	parcels_ownerId: many(parcels, {
		relationName: "parcels_ownerId_users_id"
	}),
	parcels_createdById: many(parcels, {
		relationName: "parcels_createdById_users_id"
	}),
	payments: many(payments),
	systemConfigs: many(systemConfig),
	territoryDocuments: many(territoryDocuments),
	territoryStatusHistories: many(territoryStatusHistory),
	urbanAcdApplications: many(urbanAcdApplications),
	urbanAcdDocuments_uploadedBy: many(urbanAcdDocuments, {
		relationName: "urbanAcdDocuments_uploadedBy_users_id"
	}),
	urbanAcdDocuments_verifiedBy: many(urbanAcdDocuments, {
		relationName: "urbanAcdDocuments_verifiedBy_users_id"
	}),
	urbanAcdOppositions: many(urbanAcdOppositions),
	urbanAcdSteps: many(urbanAcdSteps),
	userInvitations_invitedBy: many(userInvitations, {
		relationName: "userInvitations_invitedBy_users_id"
	}),
	userInvitations_acceptedByUserId: many(userInvitations, {
		relationName: "userInvitations_acceptedByUserId_users_id"
	}),
	userRoles_userId: many(userRoles, {
		relationName: "userRoles_userId_users_id"
	}),
	userRoles_assignedBy: many(userRoles, {
		relationName: "userRoles_assignedBy_users_id"
	}),
	verifyTokens: many(verifyTokens),
	villageTerritories: many(villageTerritories),
}));

export const appointmentsRelations = relations(appointments, ({one}) => ({
	user_citizenId: one(users, {
		fields: [appointments.citizenId],
		references: [users.id],
		relationName: "appointments_citizenId_users_id"
	}),
	user_agentId: one(users, {
		fields: [appointments.agentId],
		references: [users.id],
		relationName: "appointments_agentId_users_id"
	}),
}));

export const attestationsRelations = relations(attestations, ({one, many}) => ({
	parcel: one(parcels, {
		fields: [attestations.parcelId],
		references: [parcels.id]
	}),
	creditFile: one(creditFiles, {
		fields: [attestations.creditFileId],
		references: [creditFiles.id]
	}),
	creditDecision: one(creditDecisions, {
		fields: [attestations.decisionId],
		references: [creditDecisions.id]
	}),
	document: one(documents, {
		fields: [attestations.documentId],
		references: [documents.id]
	}),
	verifyToken: one(verifyTokens, {
		fields: [attestations.tokenId],
		references: [verifyTokens.id]
	}),
	user: one(users, {
		fields: [attestations.createdById],
		references: [users.id]
	}),
	generatedDocuments: many(generatedDocuments),
}));

export const parcelsRelations = relations(parcels, ({one, many}) => ({
	attestations: many(attestations),
	creditFiles: many(creditFiles),
	documents: many(documents),
	generatedDocuments: many(generatedDocuments),
	landTitleApplications: many(landTitleApplications),
	user_ownerId: one(users, {
		fields: [parcels.ownerId],
		references: [users.id],
		relationName: "parcels_ownerId_users_id"
	}),
	user_createdById: one(users, {
		fields: [parcels.createdById],
		references: [users.id],
		relationName: "parcels_createdById_users_id"
	}),
	urbanAcdApplications: many(urbanAcdApplications),
	urbanParcelDetails: many(urbanParcelDetails),
}));

export const creditFilesRelations = relations(creditFiles, ({one, many}) => ({
	attestations: many(attestations),
	creditDecisions: many(creditDecisions),
	creditDocuments: many(creditDocuments),
	creditFileParticipants: many(creditFileParticipants),
	user: one(users, {
		fields: [creditFiles.initiatorId],
		references: [users.id]
	}),
	parcel: one(parcels, {
		fields: [creditFiles.parcelId],
		references: [parcels.id]
	}),
	creditOffers: many(creditOffers),
	creditRequests: many(creditRequests),
	generatedDocuments: many(generatedDocuments),
}));

export const creditDecisionsRelations = relations(creditDecisions, ({one, many}) => ({
	attestations: many(attestations),
	creditFile: one(creditFiles, {
		fields: [creditDecisions.creditFileId],
		references: [creditFiles.id]
	}),
	user: one(users, {
		fields: [creditDecisions.decidedByUserId],
		references: [users.id]
	}),
}));

export const documentsRelations = relations(documents, ({one, many}) => ({
	attestations: many(attestations),
	creditDocuments: many(creditDocuments),
	parcel: one(parcels, {
		fields: [documents.parcelId],
		references: [parcels.id]
	}),
	user_ownerId: one(users, {
		fields: [documents.ownerId],
		references: [users.id],
		relationName: "documents_ownerId_users_id"
	}),
	user_createdById: one(users, {
		fields: [documents.createdById],
		references: [users.id],
		relationName: "documents_createdById_users_id"
	}),
}));

export const verifyTokensRelations = relations(verifyTokens, ({one, many}) => ({
	attestations: many(attestations),
	generatedDocuments: many(generatedDocuments),
	user: one(users, {
		fields: [verifyTokens.createdById],
		references: [users.id]
	}),
}));

export const bankMandatesRelations = relations(bankMandates, ({one}) => ({
	user_bankId: one(users, {
		fields: [bankMandates.bankId],
		references: [users.id],
		relationName: "bankMandates_bankId_users_id"
	}),
	user_citizenId: one(users, {
		fields: [bankMandates.citizenId],
		references: [users.id],
		relationName: "bankMandates_citizenId_users_id"
	}),
}));

export const citizenNotificationsRelations = relations(citizenNotifications, ({one}) => ({
	user: one(users, {
		fields: [citizenNotifications.userId],
		references: [users.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	user_citizenId: one(users, {
		fields: [conversations.citizenId],
		references: [users.id],
		relationName: "conversations_citizenId_users_id"
	}),
	user_agentId: one(users, {
		fields: [conversations.agentId],
		references: [users.id],
		relationName: "conversations_agentId_users_id"
	}),
	messages: many(messages),
}));

export const creditDocumentsRelations = relations(creditDocuments, ({one}) => ({
	creditFile: one(creditFiles, {
		fields: [creditDocuments.creditFileId],
		references: [creditFiles.id]
	}),
	document: one(documents, {
		fields: [creditDocuments.documentId],
		references: [documents.id]
	}),
	user: one(users, {
		fields: [creditDocuments.validatedById],
		references: [users.id]
	}),
}));

export const creditFileParticipantsRelations = relations(creditFileParticipants, ({one}) => ({
	creditFile: one(creditFiles, {
		fields: [creditFileParticipants.creditFileId],
		references: [creditFiles.id]
	}),
	user: one(users, {
		fields: [creditFileParticipants.userId],
		references: [users.id]
	}),
}));

export const creditOffersRelations = relations(creditOffers, ({one}) => ({
	creditFile: one(creditFiles, {
		fields: [creditOffers.creditFileId],
		references: [creditFiles.id]
	}),
	user_bankId: one(users, {
		fields: [creditOffers.bankId],
		references: [users.id],
		relationName: "creditOffers_bankId_users_id"
	}),
	user_createdByUserId: one(users, {
		fields: [creditOffers.createdByUserId],
		references: [users.id],
		relationName: "creditOffers_createdByUserId_users_id"
	}),
}));

export const creditRequestsRelations = relations(creditRequests, ({one}) => ({
	creditFile: one(creditFiles, {
		fields: [creditRequests.creditFileId],
		references: [creditFiles.id]
	}),
	user: one(users, {
		fields: [creditRequests.createdByUserId],
		references: [users.id]
	}),
}));

export const erpAccountingPreEntriesRelations = relations(erpAccountingPreEntries, ({one}) => ({
	user_createdBy: one(users, {
		fields: [erpAccountingPreEntries.createdBy],
		references: [users.id],
		relationName: "erpAccountingPreEntries_createdBy_users_id"
	}),
	user_validatedBy: one(users, {
		fields: [erpAccountingPreEntries.validatedBy],
		references: [users.id],
		relationName: "erpAccountingPreEntries_validatedBy_users_id"
	}),
}));

export const erpInvoiceLinesRelations = relations(erpInvoiceLines, ({one}) => ({
	erpInvoice: one(erpInvoices, {
		fields: [erpInvoiceLines.invoiceId],
		references: [erpInvoices.id]
	}),
}));

export const erpInvoicesRelations = relations(erpInvoices, ({one, many}) => ({
	erpInvoiceLines: many(erpInvoiceLines),
	erpProject: one(erpProjects, {
		fields: [erpInvoices.projectId],
		references: [erpProjects.id]
	}),
	erpVendor: one(erpVendors, {
		fields: [erpInvoices.vendorId],
		references: [erpVendors.id]
	}),
	erpContractor: one(erpContractors, {
		fields: [erpInvoices.contractorId],
		references: [erpContractors.id]
	}),
	user_submittedBy: one(users, {
		fields: [erpInvoices.submittedBy],
		references: [users.id],
		relationName: "erpInvoices_submittedBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [erpInvoices.approvedBy],
		references: [users.id],
		relationName: "erpInvoices_approvedBy_users_id"
	}),
	user_rejectedBy: one(users, {
		fields: [erpInvoices.rejectedBy],
		references: [users.id],
		relationName: "erpInvoices_rejectedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [erpInvoices.createdBy],
		references: [users.id],
		relationName: "erpInvoices_createdBy_users_id"
	}),
	erpPayments: many(erpPayments),
}));

export const erpProjectsRelations = relations(erpProjects, ({many}) => ({
	erpInvoices: many(erpInvoices),
	erpMilestones: many(erpMilestones),
	erpPerformanceRatings: many(erpPerformanceRatings),
	erpSafetyAudits: many(erpSafetyAudits),
	erpSafetyIncidents: many(erpSafetyIncidents),
	erpTasks: many(erpTasks),
}));

export const erpVendorsRelations = relations(erpVendors, ({many}) => ({
	erpInvoices: many(erpInvoices),
}));

export const erpContractorsRelations = relations(erpContractors, ({many}) => ({
	erpInvoices: many(erpInvoices),
}));

export const erpMilestonesRelations = relations(erpMilestones, ({one}) => ({
	erpProject: one(erpProjects, {
		fields: [erpMilestones.projectId],
		references: [erpProjects.id]
	}),
	user: one(users, {
		fields: [erpMilestones.createdBy],
		references: [users.id]
	}),
}));

export const erpNotificationsRelations = relations(erpNotifications, ({one}) => ({
	user: one(users, {
		fields: [erpNotifications.userId],
		references: [users.id]
	}),
}));

export const erpOverrunAlertsRelations = relations(erpOverrunAlerts, ({one}) => ({
	user: one(users, {
		fields: [erpOverrunAlerts.acknowledgedBy],
		references: [users.id]
	}),
}));

export const erpPaymentsRelations = relations(erpPayments, ({one}) => ({
	erpInvoice: one(erpInvoices, {
		fields: [erpPayments.invoiceId],
		references: [erpInvoices.id]
	}),
	user: one(users, {
		fields: [erpPayments.createdBy],
		references: [users.id]
	}),
}));

export const erpPerformanceRatingsRelations = relations(erpPerformanceRatings, ({one}) => ({
	erpProject: one(erpProjects, {
		fields: [erpPerformanceRatings.projectId],
		references: [erpProjects.id]
	}),
	user: one(users, {
		fields: [erpPerformanceRatings.ratedBy],
		references: [users.id]
	}),
}));

export const erpRolePermissionsRelations = relations(erpRolePermissions, ({one}) => ({
	erpRole: one(erpRoles, {
		fields: [erpRolePermissions.roleId],
		references: [erpRoles.id]
	}),
	erpPermission: one(erpPermissions, {
		fields: [erpRolePermissions.permissionId],
		references: [erpPermissions.id]
	}),
}));

export const erpRolesRelations = relations(erpRoles, ({many}) => ({
	erpRolePermissions: many(erpRolePermissions),
	erpUserRoles: many(erpUserRoles),
}));

export const erpPermissionsRelations = relations(erpPermissions, ({many}) => ({
	erpRolePermissions: many(erpRolePermissions),
}));

export const erpSafetyAuditsRelations = relations(erpSafetyAudits, ({one}) => ({
	erpProject: one(erpProjects, {
		fields: [erpSafetyAudits.projectId],
		references: [erpProjects.id]
	}),
	user: one(users, {
		fields: [erpSafetyAudits.createdBy],
		references: [users.id]
	}),
}));

export const erpSafetyIncidentsRelations = relations(erpSafetyIncidents, ({one}) => ({
	erpProject: one(erpProjects, {
		fields: [erpSafetyIncidents.projectId],
		references: [erpProjects.id]
	}),
	user_reportedBy: one(users, {
		fields: [erpSafetyIncidents.reportedBy],
		references: [users.id],
		relationName: "erpSafetyIncidents_reportedBy_users_id"
	}),
	user_assignedTo: one(users, {
		fields: [erpSafetyIncidents.assignedTo],
		references: [users.id],
		relationName: "erpSafetyIncidents_assignedTo_users_id"
	}),
	user_resolvedBy: one(users, {
		fields: [erpSafetyIncidents.resolvedBy],
		references: [users.id],
		relationName: "erpSafetyIncidents_resolvedBy_users_id"
	}),
	user_closedBy: one(users, {
		fields: [erpSafetyIncidents.closedBy],
		references: [users.id],
		relationName: "erpSafetyIncidents_closedBy_users_id"
	}),
}));

export const erpTaskDependenciesRelations = relations(erpTaskDependencies, ({one}) => ({
	erpTask_taskId: one(erpTasks, {
		fields: [erpTaskDependencies.taskId],
		references: [erpTasks.id],
		relationName: "erpTaskDependencies_taskId_erpTasks_id"
	}),
	erpTask_dependsOnTaskId: one(erpTasks, {
		fields: [erpTaskDependencies.dependsOnTaskId],
		references: [erpTasks.id],
		relationName: "erpTaskDependencies_dependsOnTaskId_erpTasks_id"
	}),
}));

export const erpTasksRelations = relations(erpTasks, ({one, many}) => ({
	erpTaskDependencies_taskId: many(erpTaskDependencies, {
		relationName: "erpTaskDependencies_taskId_erpTasks_id"
	}),
	erpTaskDependencies_dependsOnTaskId: many(erpTaskDependencies, {
		relationName: "erpTaskDependencies_dependsOnTaskId_erpTasks_id"
	}),
	erpProject: one(erpProjects, {
		fields: [erpTasks.projectId],
		references: [erpProjects.id]
	}),
}));

export const erpUserProfilesRelations = relations(erpUserProfiles, ({one}) => ({
	user: one(users, {
		fields: [erpUserProfiles.userId],
		references: [users.id]
	}),
}));

export const erpUserRolesRelations = relations(erpUserRoles, ({one}) => ({
	user_userId: one(users, {
		fields: [erpUserRoles.userId],
		references: [users.id],
		relationName: "erpUserRoles_userId_users_id"
	}),
	erpRole: one(erpRoles, {
		fields: [erpUserRoles.roleId],
		references: [erpRoles.id]
	}),
	user_assignedBy: one(users, {
		fields: [erpUserRoles.assignedBy],
		references: [users.id],
		relationName: "erpUserRoles_assignedBy_users_id"
	}),
}));

export const generatedDocumentsRelations = relations(generatedDocuments, ({one}) => ({
	parcel: one(parcels, {
		fields: [generatedDocuments.parcelId],
		references: [parcels.id]
	}),
	creditFile: one(creditFiles, {
		fields: [generatedDocuments.creditFileId],
		references: [creditFiles.id]
	}),
	attestation: one(attestations, {
		fields: [generatedDocuments.attestationId],
		references: [attestations.id]
	}),
	user: one(users, {
		fields: [generatedDocuments.generatedByUserId],
		references: [users.id]
	}),
	verifyToken: one(verifyTokens, {
		fields: [generatedDocuments.verifyTokenId],
		references: [verifyTokens.id]
	}),
}));

export const landTitleApplicationsRelations = relations(landTitleApplications, ({one, many}) => ({
	user: one(users, {
		fields: [landTitleApplications.userId],
		references: [users.id]
	}),
	parcel: one(parcels, {
		fields: [landTitleApplications.parcelId],
		references: [parcels.id]
	}),
	villageTerritory: one(villageTerritories, {
		fields: [landTitleApplications.territoryId],
		references: [villageTerritories.id]
	}),
	landTitleDocuments: many(landTitleDocuments),
	landTitleOppositions: many(landTitleOppositions),
	landTitleSteps: many(landTitleSteps),
}));

export const villageTerritoriesRelations = relations(villageTerritories, ({one, many}) => ({
	landTitleApplications: many(landTitleApplications),
	territoryBoundaryPoints: many(territoryBoundaryPoints),
	territoryDocuments: many(territoryDocuments),
	territoryStatusHistories: many(territoryStatusHistory),
	user: one(users, {
		fields: [villageTerritories.createdById],
		references: [users.id]
	}),
}));

export const landTitleDocumentsRelations = relations(landTitleDocuments, ({one}) => ({
	landTitleApplication: one(landTitleApplications, {
		fields: [landTitleDocuments.appId],
		references: [landTitleApplications.id]
	}),
	user_uploadedBy: one(users, {
		fields: [landTitleDocuments.uploadedBy],
		references: [users.id],
		relationName: "landTitleDocuments_uploadedBy_users_id"
	}),
	landTitleStep: one(landTitleSteps, {
		fields: [landTitleDocuments.stepId],
		references: [landTitleSteps.id]
	}),
	user_verifiedBy: one(users, {
		fields: [landTitleDocuments.verifiedBy],
		references: [users.id],
		relationName: "landTitleDocuments_verifiedBy_users_id"
	}),
}));

export const landTitleStepsRelations = relations(landTitleSteps, ({one, many}) => ({
	landTitleDocuments: many(landTitleDocuments),
	landTitleApplication: one(landTitleApplications, {
		fields: [landTitleSteps.appId],
		references: [landTitleApplications.id]
	}),
	user: one(users, {
		fields: [landTitleSteps.completedBy],
		references: [users.id]
	}),
}));

export const landTitleOppositionsRelations = relations(landTitleOppositions, ({one}) => ({
	landTitleApplication: one(landTitleApplications, {
		fields: [landTitleOppositions.appId],
		references: [landTitleApplications.id]
	}),
	user: one(users, {
		fields: [landTitleOppositions.resolvedBy],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [messages.senderId],
		references: [users.id]
	}),
}));

export const notaryBasketsRelations = relations(notaryBaskets, ({one}) => ({
	user: one(users, {
		fields: [notaryBaskets.notaryId],
		references: [users.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user: one(users, {
		fields: [payments.userId],
		references: [users.id]
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	rolePermissions: many(rolePermissions),
	userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const systemConfigRelations = relations(systemConfig, ({one}) => ({
	user: one(users, {
		fields: [systemConfig.updatedBy],
		references: [users.id]
	}),
}));

export const territoryBoundaryPointsRelations = relations(territoryBoundaryPoints, ({one}) => ({
	villageTerritory: one(villageTerritories, {
		fields: [territoryBoundaryPoints.territoryId],
		references: [villageTerritories.id]
	}),
}));

export const territoryDocumentsRelations = relations(territoryDocuments, ({one}) => ({
	villageTerritory: one(villageTerritories, {
		fields: [territoryDocuments.territoryId],
		references: [villageTerritories.id]
	}),
	user: one(users, {
		fields: [territoryDocuments.uploadedById],
		references: [users.id]
	}),
}));

export const territoryStatusHistoryRelations = relations(territoryStatusHistory, ({one}) => ({
	villageTerritory: one(villageTerritories, {
		fields: [territoryStatusHistory.territoryId],
		references: [villageTerritories.id]
	}),
	user: one(users, {
		fields: [territoryStatusHistory.changedById],
		references: [users.id]
	}),
}));

export const urbanAcdApplicationsRelations = relations(urbanAcdApplications, ({one, many}) => ({
	user: one(users, {
		fields: [urbanAcdApplications.userId],
		references: [users.id]
	}),
	parcel: one(parcels, {
		fields: [urbanAcdApplications.parcelId],
		references: [parcels.id]
	}),
	urbanAcdDocuments: many(urbanAcdDocuments),
	urbanAcdOppositions: many(urbanAcdOppositions),
	urbanAcdSteps: many(urbanAcdSteps),
}));

export const urbanAcdDocumentsRelations = relations(urbanAcdDocuments, ({one}) => ({
	urbanAcdApplication: one(urbanAcdApplications, {
		fields: [urbanAcdDocuments.appId],
		references: [urbanAcdApplications.id]
	}),
	user_uploadedBy: one(users, {
		fields: [urbanAcdDocuments.uploadedBy],
		references: [users.id],
		relationName: "urbanAcdDocuments_uploadedBy_users_id"
	}),
	urbanAcdStep: one(urbanAcdSteps, {
		fields: [urbanAcdDocuments.stepId],
		references: [urbanAcdSteps.id]
	}),
	user_verifiedBy: one(users, {
		fields: [urbanAcdDocuments.verifiedBy],
		references: [users.id],
		relationName: "urbanAcdDocuments_verifiedBy_users_id"
	}),
}));

export const urbanAcdStepsRelations = relations(urbanAcdSteps, ({one, many}) => ({
	urbanAcdDocuments: many(urbanAcdDocuments),
	urbanAcdApplication: one(urbanAcdApplications, {
		fields: [urbanAcdSteps.appId],
		references: [urbanAcdApplications.id]
	}),
	user: one(users, {
		fields: [urbanAcdSteps.completedBy],
		references: [users.id]
	}),
}));

export const urbanAcdOppositionsRelations = relations(urbanAcdOppositions, ({one}) => ({
	urbanAcdApplication: one(urbanAcdApplications, {
		fields: [urbanAcdOppositions.appId],
		references: [urbanAcdApplications.id]
	}),
	user: one(users, {
		fields: [urbanAcdOppositions.resolvedBy],
		references: [users.id]
	}),
}));

export const urbanParcelDetailsRelations = relations(urbanParcelDetails, ({one}) => ({
	parcel: one(parcels, {
		fields: [urbanParcelDetails.parcelId],
		references: [parcels.id]
	}),
}));

export const userInvitationsRelations = relations(userInvitations, ({one}) => ({
	user_invitedBy: one(users, {
		fields: [userInvitations.invitedBy],
		references: [users.id],
		relationName: "userInvitations_invitedBy_users_id"
	}),
	user_acceptedByUserId: one(users, {
		fields: [userInvitations.acceptedByUserId],
		references: [users.id],
		relationName: "userInvitations_acceptedByUserId_users_id"
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user_userId: one(users, {
		fields: [userRoles.userId],
		references: [users.id],
		relationName: "userRoles_userId_users_id"
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user_assignedBy: one(users, {
		fields: [userRoles.assignedBy],
		references: [users.id],
		relationName: "userRoles_assignedBy_users_id"
	}),
}));