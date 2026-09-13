import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { ProductionLog, ProductionLogDocument } from '../production/schemas/production-log.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import {
  SupplierPayment,
  SupplierPaymentDocument,
} from '../suppliers/schemas/supplier-payment.schema';
import { MaterialLot, MaterialLotDocument } from '../material-lots/schemas/material-lot.schema';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(ProductionLog.name)
    private readonly productionLogModel: Model<ProductionLogDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(SupplierPayment.name)
    private readonly supplierPaymentModel: Model<SupplierPaymentDocument>,
    @InjectModel(MaterialLot.name)
    private readonly materialLotModel: Model<MaterialLotDocument>,
  ) {}

  async getSalesReport(dateFrom?: string, dateTo?: string, groupBy: 'day' | 'week' | 'month' = 'month') {
    const matchStage: any = { status: { $ne: 'CANCELLED' } };

    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    // Total stats
    const totalsResult = await this.orderModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ])
      .exec();

    const totalOrders = totalsResult.length > 0 ? totalsResult[0].totalOrders : 0;
    const totalAmount = totalsResult.length > 0 ? totalsResult[0].totalAmount : 0;
    const averageOrderAmount = totalOrders > 0 ? totalAmount / totalOrders : 0;

    // Breakdown by period
    let dateGroupExpression: any;
    if (groupBy === 'day') {
      dateGroupExpression = {
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
      };
    } else if (groupBy === 'week') {
      dateGroupExpression = {
        $dateToString: { format: '%Y-W%V', date: '$createdAt' },
      };
    } else {
      dateGroupExpression = {
        $dateToString: { format: '%Y-%m', date: '$createdAt' },
      };
    }

    const breakdown = await this.orderModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: dateGroupExpression,
            orderCount: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            period: '$_id',
            orderCount: 1,
            totalAmount: 1,
          },
        },
      ])
      .exec();

    // Top products
    const topProducts = await this.orderModel
      .aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productName',
            quantity: { $sum: '$items.quantity' },
            totalAmount: { $sum: '$items.total' },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            productName: '$_id',
            quantity: 1,
            totalAmount: 1,
          },
        },
      ])
      .exec();

    // Top customers
    const topCustomers = await this.orderModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$customer',
            orderCount: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customerInfo',
          },
        },
        { $unwind: '$customerInfo' },
        {
          $project: {
            _id: 0,
            customerName: '$customerInfo.name',
            orderCount: 1,
            totalAmount: 1,
          },
        },
      ])
      .exec();

    return {
      totalOrders,
      totalAmount,
      averageOrderAmount,
      breakdown,
      topProducts,
      topCustomers,
    };
  }

  async getProductionReport(dateFrom?: string, dateTo?: string) {
    const matchStage: any = { status: 'APPROVED' };

    if (dateFrom || dateTo) {
      matchStage.date = {};
      if (dateFrom) matchStage.date.$gte = new Date(dateFrom);
      if (dateTo) matchStage.date.$lte = new Date(dateTo);
    }

    // Total stats
    const totalsResult = await this.productionLogModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalProduced: { $sum: '$quantityProduced' },
            totalEarned: { $sum: '$earnedAmount' },
          },
        },
      ])
      .exec();

    const totalProduced = totalsResult.length > 0 ? totalsResult[0].totalProduced : 0;
    const totalEarned = totalsResult.length > 0 ? totalsResult[0].totalEarned : 0;

    // By product (using productName snapshot in log)
    const byProduct = await this.productionLogModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$productName',
            totalQuantity: { $sum: '$quantityProduced' },
            totalEarned: { $sum: '$earnedAmount' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        {
          $project: {
            _id: 0,
            productName: '$_id',
            totalQuantity: 1,
            totalEarned: 1,
          },
        },
      ])
      .exec();

    // By worker
    const byWorker = await this.productionLogModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$worker',
            totalQuantity: { $sum: '$quantityProduced' },
            totalEarned: { $sum: '$earnedAmount' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'workerInfo',
          },
        },
        { $unwind: '$workerInfo' },
        { $sort: { totalQuantity: -1 } },
        {
          $project: {
            _id: 0,
            workerName: '$workerInfo.fullName',
            totalQuantity: 1,
            totalEarned: 1,
          },
        },
      ])
      .exec();

    // Daily breakdown
    const dailyBreakdown = await this.productionLogModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            totalQuantity: { $sum: '$quantityProduced' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            totalQuantity: 1,
          },
        },
      ])
      .exec();

    // By machine (Stanoklar yuki — simplified: hours worked + defect qty/rate, no OEE)
    const byMachineRaw = await this.productionLogModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $ifNull: ['$machineName', "Stanok ko'rsatilmagan"] },
            totalHoursWorked: { $sum: { $ifNull: ['$hoursWorked', 0] } },
            totalQuantityGood: { $sum: '$quantityProduced' },
            totalQuantityDefective: { $sum: { $ifNull: ['$quantityDefective', 0] } },
          },
        },
        { $sort: { totalQuantityGood: -1 } },
        {
          $project: {
            _id: 0,
            machineName: '$_id',
            totalHoursWorked: 1,
            totalQuantityGood: 1,
            totalQuantityDefective: 1,
          },
        },
      ])
      .exec();

    const byMachine = byMachineRaw.map((m) => {
      const totalQuantity = m.totalQuantityGood + m.totalQuantityDefective;
      const defectRate = totalQuantity > 0 ? (m.totalQuantityDefective / totalQuantity) * 100 : 0;
      return { ...m, defectRate };
    });

    return {
      totalProduced,
      totalEarned,
      byProduct,
      byWorker,
      byMachine,
      dailyBreakdown,
    };
  }

  async getStockReport() {
    const products = await this.productModel
      .find()
      .select('name currentStock price')
      .sort({ name: 1 })
      .exec();

    const lowStockAlerts = products
      .filter((product: any) => product.currentStock <= 0)
      .map((product: any) => ({
        name: product.name,
        currentStock: product.currentStock,
        minStock: 0,
      }));

    return {
      products: products.map((p) => ({
        _id: p._id,
        name: p.name,
        currentStock: p.currentStock,
        price: p.price,
      })),
      lowStockAlerts,
    };
  }

  async getAttendanceReport(year?: number, month?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const users = await this.userModel
      .find({ isActive: true })
      .select('fullName role')
      .exec();

    const attendanceRecords = await this.attendanceModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .exec();

    // Build attendance map per user
    const attendanceMap = new Map<string, any[]>();
    for (const record of attendanceRecords) {
      const userId = record.user.toString();
      if (!attendanceMap.has(userId)) {
        attendanceMap.set(userId, []);
      }
      attendanceMap.get(userId)!.push(record);
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    const byEmployee = users.map((user) => {
      const records = attendanceMap.get(user._id.toString()) || [];
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let totalHours = 0;
      let overtimeHours = 0;

      for (const record of records) {
        if (record.status === 'PRESENT') presentDays++;
        else if (record.status === 'ABSENT') absentDays++;
        else if (record.status === 'LATE') lateDays++;
        totalHours += record.hoursWorked || 0;
        overtimeHours += record.overtimeHours || 0;
      }

      totalPresent += presentDays;
      totalAbsent += absentDays;
      totalLate += lateDays;

      return {
        fullName: user.fullName,
        role: user.role,
        presentDays,
        absentDays,
        lateDays,
        totalHours,
        overtimeHours,
      };
    });

    const totalEntries = totalPresent + totalAbsent + totalLate;
    const averageAttendance =
      totalEntries > 0 ? Math.round((totalPresent / totalEntries) * 100) : 0;

    return {
      byEmployee,
      summary: {
        totalPresent,
        totalAbsent,
        totalLate,
        averageAttendance,
      },
    };
  }

  async getSupplierReconciliation(
    supplierId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const supplier = await this.supplierModel.findById(supplierId).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${supplierId}" not found`);
    }

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const [lots, payments] = await Promise.all([
      this.materialLotModel
        .find({ supplier: supplierId, source: 'PURCHASE' })
        .populate('material', 'name')
        .sort({ createdAt: 1 })
        .exec(),
      this.supplierPaymentModel
        .find({ supplier: supplierId })
        .sort({ createdAt: 1 })
        .exec(),
    ]);

    type LedgerEvent = {
      date: Date;
      type: 'DEBT' | 'PAYMENT';
      description: string;
      reference: string;
      debit: number;
      credit: number;
    };

    const events: LedgerEvent[] = [
      ...lots.map((lot: any) => ({
        date: lot.createdAt,
        type: 'DEBT' as const,
        description: `Xom-ashyo kirimi: ${lot.material?.name || ''} (${lot.lotNumber})`,
        reference: lot.lotNumber,
        debit: lot.totalCost,
        credit: 0,
      })),
      ...payments.map((payment: any) => ({
        date: payment.createdAt,
        type: 'PAYMENT' as const,
        description: `To'lov (${payment.type})${payment.notes ? ' - ' + payment.notes : ''}`,
        reference: payment._id.toString(),
        debit: 0,
        credit: payment.amount,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let openingBalance = 0;
    for (const event of events) {
      if (from && event.date < from) {
        openingBalance += event.debit - event.credit;
      }
    }

    let runningBalance = openingBalance;
    const entries = [];
    for (const event of events) {
      if (from && event.date < from) continue;
      if (to && event.date > to) continue;

      runningBalance += event.debit - event.credit;
      entries.push({
        date: event.date,
        type: event.type,
        description: event.description,
        reference: event.reference,
        debit: event.debit,
        credit: event.credit,
        balance: runningBalance,
      });
    }

    return {
      supplier: {
        _id: supplier._id,
        name: supplier.name,
        phone: supplier.phone,
      },
      openingBalance,
      closingBalance: runningBalance,
      currentDebt: supplier.currentDebt,
      entries,
      period: { from: dateFrom, to: dateTo },
    };
  }
}
