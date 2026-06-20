/**
 * ERP Exports Router — Sprint 20
 * 
 * Provides CSV export procedures for key ERP modules:
 * - Projects list
 * - Invoices
 * - Inventory items
 * - Tasks
 * - Payments
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { erpProtectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpProjects,
  erpInvoices,
  erpInventoryItems,
  erpTasks,
  erpPayments,
} from "../../drizzle/schema";
import { isNull, eq, and, desc } from "drizzle-orm";
import { generateCsv, formatDate, formatAmountXOF, type CsvColumn } from "../export-csv";

export const erpExportsRouter = router({
  /**
   * Export projects to CSV
   */
  projects: erpProtectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      let query = db.select().from(erpProjects).where(isNull(erpProjects.deletedAt));
      const projects = await query.orderBy(desc(erpProjects.createdAt));

      const columns: CsvColumn<typeof projects[0]>[] = [
        { header: "Code", accessor: (r) => r.code },
        { header: "Nom du projet", accessor: (r) => r.name },
        { header: "Client", accessor: (r) => r.clientName },
        { header: "Localisation", accessor: (r) => r.location },
        { header: "Statut", accessor: (r) => r.status },
        { header: "Priorité", accessor: (r) => r.priority },
        { header: "Progression (%)", accessor: (r) => r.progressPercentage },
        { header: "Date début", accessor: (r) => formatDate(r.startDate) },
        { header: "Date fin prévue", accessor: (r) => formatDate(r.plannedEndDate) },
        { header: "Budget initial (XOF)", accessor: (r) => formatAmountXOF(r.initialBudget) },
        { header: "Budget révisé (XOF)", accessor: (r) => formatAmountXOF(r.revisedBudget) },
        { header: "Créé le", accessor: (r) => formatDate(r.createdAt) },
      ];

      return { csv: generateCsv(projects, columns), filename: `projets_erp_${Date.now()}.csv` };
    }),

  /**
   * Export invoices to CSV
   */
  invoices: erpProtectedProcedure
    .input(z.object({ projectId: z.number().optional(), status: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const invoices = await db.select().from(erpInvoices).orderBy(desc(erpInvoices.issueDate));

      const columns: CsvColumn<typeof invoices[0]>[] = [
        { header: "N° Facture", accessor: (r) => r.invoiceNumber },
        { header: "Référence", accessor: (r) => r.reference },
        { header: "Type", accessor: (r) => r.type },
        { header: "Statut", accessor: (r) => r.status },
        { header: "Date émission", accessor: (r) => formatDate(r.issueDate) },
        { header: "Date échéance", accessor: (r) => formatDate(r.dueDate) },
        { header: "Montant HT (XOF)", accessor: (r) => formatAmountXOF(r.subtotal) },
        { header: "TVA (XOF)", accessor: (r) => formatAmountXOF(r.taxAmount) },
        { header: "Montant TTC (XOF)", accessor: (r) => formatAmountXOF(r.totalAmount) },
        { header: "Montant payé (XOF)", accessor: (r) => formatAmountXOF(r.paidAmount) },
        { header: "Devise", accessor: (r) => r.currency },
      ];

      return { csv: generateCsv(invoices, columns), filename: `factures_erp_${Date.now()}.csv` };
    }),

  /**
   * Export inventory items to CSV
   */
  inventory: erpProtectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const items = await db.select().from(erpInventoryItems).where(
        isNull(erpInventoryItems.deletedAt)
      );

      const columns: CsvColumn<typeof items[0]>[] = [
        { header: "SKU", accessor: (r) => r.sku },
        { header: "Nom", accessor: (r) => r.name },
        { header: "Catégorie", accessor: (r) => r.category },
        { header: "Unité", accessor: (r) => r.unit },
        { header: "Stock actuel", accessor: (r) => r.currentStock },
        { header: "Stock minimum", accessor: (r) => r.minStock },
        { header: "Stock maximum", accessor: (r) => r.maxStock },
        { header: "Prix unitaire (XOF)", accessor: (r) => formatAmountXOF(r.unitPrice) },
        { header: "Créé le", accessor: (r) => formatDate(r.createdAt) },
      ];

      return { csv: generateCsv(items, columns), filename: `inventaire_erp_${Date.now()}.csv` };
    }),

  /**
   * Export tasks to CSV
   */
  tasks: erpProtectedProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      let conditions = [isNull(erpTasks.deletedAt)];
      if (input?.projectId) {
        conditions.push(eq(erpTasks.projectId, input.projectId));
      }

      const tasks = await db.select().from(erpTasks).where(and(...conditions)).orderBy(desc(erpTasks.createdAt));

      const columns: CsvColumn<typeof tasks[0]>[] = [
        { header: "Titre", accessor: (r) => r.title },
        { header: "Statut", accessor: (r) => r.status },
        { header: "Priorité", accessor: (r) => r.priority },
        { header: "Date début", accessor: (r) => formatDate(r.startDate) },
        { header: "Date fin", accessor: (r) => formatDate(r.dueDate) },
        { header: "Progression (%)", accessor: (r) => r.progressPercentage },
        { header: "Créé le", accessor: (r) => formatDate(r.createdAt) },
      ];

      return { csv: generateCsv(tasks, columns), filename: `taches_erp_${Date.now()}.csv` };
    }),

  /**
   * Export payments to CSV
   */
  payments: erpProtectedProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const payments = await db.select().from(erpPayments).orderBy(desc(erpPayments.paymentDate));

      const columns: CsvColumn<typeof payments[0]>[] = [
        { header: "Référence", accessor: (r) => r.reference },
        { header: "Méthode", accessor: (r) => r.paymentMethod },
        { header: "Montant (XOF)", accessor: (r) => formatAmountXOF(r.amount) },
        { header: "Date paiement", accessor: (r) => formatDate(r.paymentDate) },
        { header: "Notes", accessor: (r) => r.notes },
      ];

      return { csv: generateCsv(payments, columns), filename: `paiements_erp_${Date.now()}.csv` };
    }),
});
