'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatIDR, formatNumber } from '@/lib/format';

const axis = {
  tick: { fontSize: 10, fill: '#8b8b8b' },
  axisLine: false,
  tickLine: false,
} as const;

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  background: '#fff',
  fontSize: 11,
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  color: '#111',
};

export function SalesTrendChart({
  data,
}: {
  data: Array<{ label: string; revenue: number; orders: number }>;
}) {
  if (!data.length) {
    return <ChartEmpty />;
  }
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8b8b8b" opacity={0.14} vertical={false} />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
          <YAxis
            {...axis}
            width={54}
            tickFormatter={(value) => formatIDR(value, true).replace('Rp ', '')}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) =>
              name === 'Omzet' ? [formatIDR(value), name] : [formatNumber(value), name]
            }
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Omzet"
            stroke="#FF5A1F"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#FF5A1F' }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            name="Pesanan"
            stroke="#0A0A0A"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            yAxisId={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashFlowChart({
  data,
}: {
  data: Array<{ label: string; cashIn: number; cashOut: number }>;
}) {
  if (!data.length) return <ChartEmpty />;
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8b8b8b" opacity={0.14} vertical={false} />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
          <YAxis
            {...axis}
            width={54}
            tickFormatter={(value) => formatIDR(value, true).replace('Rp ', '')}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => formatIDR(value)}
            cursor={{ fill: 'rgba(255,90,31,0.05)' }}
          />
          <Bar dataKey="cashIn" name="Kas masuk" fill="#FF5A1F" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="cashOut" name="Kas keluar" fill="#1F2937" radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProductBarChart({
  data,
}: {
  data: Array<{ name: string; quantity: number }>;
}) {
  if (!data.length) return <ChartEmpty />;
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8b8b8b" opacity={0.12} horizontal={false} />
          <XAxis type="number" {...axis} tickFormatter={(value) => formatNumber(value)} />
          <YAxis
            type="category"
            dataKey="name"
            {...axis}
            width={118}
            tick={{ fontSize: 10, fill: '#8b8b8b' }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [formatNumber(value) + ' unit', 'Terjual']}
            cursor={{ fill: 'rgba(255,90,31,0.05)' }}
          />
          <Bar dataKey="quantity" fill="#FF5A1F" radius={[0, 5, 5, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const pieColors = ['#FF5A1F', '#0A0A0A', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'];

export function PaymentDonut({
  data,
}: {
  data: Array<{ name: string; amount: number }>;
}) {
  if (!data.length || data.every((item) => item.amount <= 0)) return <ChartEmpty />;
  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={80}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatIDR(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyChart({
  data,
}: {
  data: Array<{ label: string; revenue: number }>;
}) {
  if (!data.length) return <ChartEmpty />;
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8b8b8b" opacity={0.14} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis
            {...axis}
            width={50}
            tickFormatter={(value) => formatIDR(value, true).replace('Rp ', '')}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatIDR(value)} />
          <Bar dataKey="revenue" name="Omzet" fill="#FF5A1F" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-black/10 text-center text-xs text-gray-400 dark:border-white/10 dark:text-gray-500">
      Belum ada data pada periode ini.
    </div>
  );
}
