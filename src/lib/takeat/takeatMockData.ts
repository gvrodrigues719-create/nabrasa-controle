/**
 * Takeat Mock Data — Demonstração Estrutural
 *
 * ATENÇÃO: Estes dados são MOCKADOS para demonstração.
 * A estrutura respeita o retorno esperado da API /table-sessions.
 * Substituir por chamada real ao plugar TakeatService.
 */

import type { TakeatTableSession, TakeatPeriodSummary } from './takeatTypes'

export const MOCK_PERIOD = {
  start: '2026-04-13T03:00:00Z', // 13/04 00:00 Brasília
  end:   '2026-04-15T02:59:59Z', // 14/04 23:59 Brasília — janela de 2 dias (máx 3)
  label: '13 a 14 de Abril de 2026',
}

export const MOCK_SESSIONS: TakeatTableSession[] = [
  {
    id: 'ts-001',
    key: 'Mesa 7',
    status: 'finished',
    channel: { id: 'ch-1', name: 'Mesa' },
    created_at: '2026-04-13T20:14:00Z',
    finished_at: '2026-04-13T22:41:00Z',
    buyer: { name: 'Rafael M.' },
    waiter: { name: 'João' },
    bills: [{
      id: 'bill-001',
      total_price: '187.50',
      total_service_price: '206.25',
      total_discount: '0.00',
      status: 'paid',
      orders: [{
        id: 'ord-001',
        status: 'delivered',
        total_price: '187.50',
        created_at: '2026-04-13T20:22:00Z',
        order_products: [
          { id: 'op-1', name: 'Picanha 300g', amount: 2, price: '58.90', total_price: '117.80', complements: [] },
          { id: 'op-2', name: 'Cerveja Artesanal 500ml', amount: 4, price: '14.90', total_price: '59.60', complements: [] },
          { id: 'op-3', name: 'Pão de Alho', amount: 1, price: '10.10', total_price: '10.10', complements: [] },
        ]
      }]
    }],
    payments: [{ id: 'pay-001', payment_method: { id: 'pm-1', name: 'Crédito' }, value: '206.25', created_at: '2026-04-13T22:38:00Z' }],
    order_baskets: [],
    nfce: { status: 'issued', number: '000412', issued_at: '2026-04-13T22:40:00Z' }
  },
  {
    id: 'ts-002',
    key: 'Balcão 3',
    status: 'finished',
    channel: { id: 'ch-2', name: 'Balcão' },
    created_at: '2026-04-13T21:05:00Z',
    finished_at: '2026-04-13T21:38:00Z',
    waiter: { name: 'Ana' },
    bills: [{
      id: 'bill-002',
      total_price: '64.80',
      total_service_price: '64.80',
      total_discount: '5.00',
      status: 'paid',
      orders: [{
        id: 'ord-002',
        status: 'delivered',
        total_price: '64.80',
        created_at: '2026-04-13T21:10:00Z',
        order_products: [
          { id: 'op-4', name: 'Fraldinha 250g', amount: 1, price: '48.90', total_price: '48.90', complements: [] },
          { id: 'op-5', name: 'Refrigerante Lata', amount: 2, price: '7.95', total_price: '15.90', complements: [] },
        ]
      }]
    }],
    payments: [{ id: 'pay-002', payment_method: { id: 'pm-2', name: 'PIX' }, value: '64.80', created_at: '2026-04-13T21:36:00Z' }],
    order_baskets: [],
  },
  {
    id: 'ts-003',
    key: 'Mesa 12',
    status: 'finished',
    channel: { id: 'ch-1', name: 'Mesa' },
    created_at: '2026-04-14T19:30:00Z',
    finished_at: '2026-04-14T21:55:00Z',
    buyer: { name: 'Empresa XYZ — Evento' },
    waiter: { name: 'Carlos' },
    bills: [{
      id: 'bill-003',
      total_price: '412.00',
      total_service_price: '453.20',
      total_discount: '20.00',
      status: 'paid',
      orders: [{
        id: 'ord-003',
        status: 'delivered',
        total_price: '412.00',
        created_at: '2026-04-14T19:45:00Z',
        order_products: [
          { id: 'op-6', name: 'Costela Assada kg', amount: 3, price: '89.90', total_price: '269.70', complements: [] },
          { id: 'op-7', name: 'Caipirinha', amount: 6, price: '18.90', total_price: '113.40', complements: [] },
          { id: 'op-8', name: 'Farofa Especial', amount: 2, price: '14.45', total_price: '28.90', complements: [] },
        ]
      }]
    }],
    payments: [
      { id: 'pay-003a', payment_method: { id: 'pm-1', name: 'Crédito' }, value: '300.00', created_at: '2026-04-14T21:50:00Z' },
      { id: 'pay-003b', payment_method: { id: 'pm-2', name: 'PIX' }, value: '153.20', created_at: '2026-04-14T21:52:00Z' },
    ],
    order_baskets: [],
    nfce: { status: 'issued', number: '000413', issued_at: '2026-04-14T21:54:00Z' }
  },
  {
    id: 'ts-004',
    key: 'Delivery #2241',
    status: 'finished',
    channel: { id: 'ch-3', name: 'Delivery' },
    created_at: '2026-04-14T20:10:00Z',
    finished_at: '2026-04-14T21:02:00Z',
    buyer: { name: 'Luciana F.', phone: '(11) 9****-4821' },
    bills: [{
      id: 'bill-004',
      total_price: '95.70',
      total_service_price: '95.70',
      total_discount: '0.00',
      status: 'paid',
      orders: [{
        id: 'ord-004',
        status: 'delivered',
        total_price: '95.70',
        created_at: '2026-04-14T20:15:00Z',
        order_products: [
          { id: 'op-9', name: 'Combo Churrasco 2 pessoas', amount: 1, price: '79.90', total_price: '79.90', complements: [
            { id: 'comp-1', name: '+ Molho Especial', amount: 1, price: '5.90' },
          ]},
          { id: 'op-10', name: 'Água Mineral 500ml', amount: 2, price: '4.90', total_price: '9.80', complements: [] },
        ]
      }]
    }],
    payments: [{ id: 'pay-004', payment_method: { id: 'pm-3', name: 'Débito' }, value: '95.70', created_at: '2026-04-14T21:00:00Z' }],
    order_baskets: [],
  },
  {
    id: 'ts-005',
    key: 'Mesa 2',
    status: 'finished',
    channel: { id: 'ch-1', name: 'Mesa' },
    created_at: '2026-04-14T12:00:00Z',
    finished_at: '2026-04-14T13:30:00Z',
    waiter: { name: 'João' },
    bills: [{
      id: 'bill-005',
      total_price: '73.80',
      total_service_price: '81.18',
      total_discount: '0.00',
      status: 'paid',
      orders: [{
        id: 'ord-005',
        status: 'delivered',
        total_price: '73.80',
        created_at: '2026-04-14T12:10:00Z',
        order_products: [
          { id: 'op-11', name: 'Alcatra 300g', amount: 1, price: '52.90', total_price: '52.90', complements: [] },
          { id: 'op-12', name: 'Suco Natural 500ml', amount: 2, price: '10.45', total_price: '20.90', complements: [] },
        ]
      }]
    }],
    payments: [{ id: 'pay-005', payment_method: { id: 'pm-4', name: 'Dinheiro' }, value: '81.18', created_at: '2026-04-14T13:28:00Z' }],
    order_baskets: [],
  },
]

export const MOCK_SUMMARY: TakeatPeriodSummary = {
  total_sessions: 5,
  total_products_sold: 19,
  total_revenue: 833.80,
  total_with_service: 901.63,
  total_payments: 7,
  total_discounts: 25.00,
  channels_found: ['Mesa', 'Balcão', 'Delivery'],
  nfce_available: 2,
  period_start: MOCK_PERIOD.start,
  period_end: MOCK_PERIOD.end,
}

export const MOCK_PAYMENT_METHODS = [
  { id: 'pm-1', name: 'Crédito' },
  { id: 'pm-2', name: 'PIX' },
  { id: 'pm-3', name: 'Débito' },
  { id: 'pm-4', name: 'Dinheiro' },
]
