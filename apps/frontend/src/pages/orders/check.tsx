import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Customer } from '@plastmassa/shared';
import { formatCurrency } from '@/lib/utils';
import { useOrder } from '@/hooks/use-orders';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const COMPANY_NAME = "SARDOBA KO'ZA PLAST MChJ";
const COMPANY_ADDRESS = "O'zbekiston";

export default function OrderCheckPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, isError } = useOrder(id || '');

  const getCustomerName = (customer: string | Customer): string => {
    if (typeof customer === 'string') return customer;
    return customer.name;
  };

  const getCustomerPhone = (customer: string | Customer): string | undefined => {
    if (typeof customer === 'string') return undefined;
    return customer.phone;
  };

  const getCustomerAddress = (customer: string | Customer): string | undefined => {
    if (typeof customer === 'string') return undefined;
    return (customer as any).address;
  };

  const handlePrint = (): void => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Buyurtma topilmadi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          So'ralgan buyurtma mavjud emas
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/orders')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Buyurtmalarga qaytish
        </Button>
      </div>
    );
  }

  const remaining = order.totalAmount - order.paidAmount;
  const customerName = getCustomerName(order.customer);
  const customerPhone = getCustomerPhone(order.customer);
  const customerAddress = getCustomerAddress(order.customer);
  const invoiceNumber = (order as any).invoiceNumber;
  const displayNumber = invoiceNumber || order.orderNumber;

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 210mm;
            min-height: 297mm;
            background: white !important;
            color: black !important;
            padding: 15mm 20mm;
            margin: 0;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: 12pt;
          }
          .print-area * {
            color: black !important;
            background: transparent !important;
            border-color: #333 !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      {/* Action Buttons (hidden on print) */}
      <div className="no-print space-y-4 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/orders/${id}`)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Buyurtmaga qaytish
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Chop etish
          </Button>
        </motion.div>
      </div>

      {/* Invoice Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="print-area max-w-3xl mx-auto bg-white text-black rounded-2xl border border-border/50 p-10"
      >
        {/* Top: Company Info (left) + Invoice Number/Date (right) */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-black tracking-wide">
              {COMPANY_NAME}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{COMPANY_ADDRESS}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-black">
              HISOB-FAKTURA
            </h2>
            <p className="text-lg font-semibold text-black mt-1">
              #{displayNumber}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(order.createdAt), 'dd.MM.yyyy')}
            </p>
          </div>
        </div>

        {/* Customer Info Block */}
        <div className="mb-8 p-4 border border-gray-300 rounded-lg">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Mijoz</p>
          <p className="text-base font-semibold text-black">{customerName}</p>
          {customerPhone && (
            <p className="text-sm text-gray-600 mt-0.5">Tel: {customerPhone}</p>
          )}
          {customerAddress && (
            <p className="text-sm text-gray-600 mt-0.5">Manzil: {customerAddress}</p>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-2.5 text-gray-700 font-bold w-10">#</th>
                <th className="text-left py-2.5 text-gray-700 font-bold">Mahsulot</th>
                <th className="text-center py-2.5 text-gray-700 font-bold w-24">Miqdor</th>
                <th className="text-right py-2.5 text-gray-700 font-bold w-28">Narx</th>
                <th className="text-right py-2.5 text-gray-700 font-bold w-32">Jami</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-2.5 text-gray-500">{index + 1}</td>
                  <td className="py-2.5 text-black font-medium">{item.productName}</td>
                  <td className="py-2.5 text-center text-black">
                    {item.quantity} {item.unitName}
                  </td>
                  <td className="py-2.5 text-right text-gray-600">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="py-2.5 text-right text-black font-medium">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-10">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-base border-b border-gray-200 pb-2">
              <span className="text-gray-600">Jami:</span>
              <span className="font-bold text-black text-lg">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">To'langan:</span>
              <span className="font-semibold text-black">
                {formatCurrency(order.paidAmount)}
              </span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                <span className="text-gray-600 font-semibold">Qoldiq:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(remaining)}
                </span>
              </div>
            )}
            {(order as any).dueDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">To'lov muddati:</span>
                <span className="text-black">
                  {format(new Date((order as any).dueDate), 'dd.MM.yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Signature Footer */}
        <div className="border-t-2 border-gray-800 pt-8">
          <div className="grid grid-cols-2 gap-16">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-10">Topshirdi:</p>
              <div className="border-b border-gray-400 mb-1" />
              <p className="text-xs text-gray-500">(imzo / F.I.O.)</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-10">Qabul qildi:</p>
              <div className="border-b border-gray-400 mb-1" />
              <p className="text-xs text-gray-500">(imzo / F.I.O.)</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
