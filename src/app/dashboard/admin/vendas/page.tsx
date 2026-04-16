'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, CheckCircle2, Clock, AlertCircle,
  ShoppingCart, CreditCard, FileText, Package,
  TrendingUp, ArrowRight, BarChart3, Layers,
  Utensils, Wifi, Truck, ChevronDown, ChevronUp
} from 'lucide-react'
import { MOCK_SESSIONS, MOCK_SUMMARY, MOCK_PERIOD } from '@/lib/takeat/takeatMockData'

// -------------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------------
function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
}

// -------------------------------------------------------------------
// COMPONENTES INTERNOS
// -------------------------------------------------------------------

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100">
      {ok
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        : <Clock className="w-4 h-4 text-amber-500 shrink-0" />
      }
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  )
}

function SummaryCard({ label, value, sub, color = 'indigo' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    gray: 'text-gray-600',
  }
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-extrabold ${colors[color] ?? colors.indigo}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function FlowStep({ icon: Icon, label, sub, isLast = false }: {
  icon: React.ElementType; label: string; sub: string; isLast?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
        {!isLast && <div className="w-px h-6 bg-indigo-100 mt-1" />}
      </div>
      <div className="pt-1 pb-2">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function DataSourceChip({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
      <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  )
}

// -------------------------------------------------------------------
// PÁGINA PRINCIPAL
// -------------------------------------------------------------------
export default function VendasPage() {
  const router = useRouter()
  const [tableExpanded, setTableExpanded] = useState(false)

  const visibleSessions = tableExpanded ? MOCK_SESSIONS : MOCK_SESSIONS.slice(0, 3)

  return (
    <div className="p-4 space-y-5 pb-24">

      {/* ── BLOCO A — CABEÇALHO ────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => router.push('/dashboard/admin')}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Novo Eixo</p>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wider">
              Em desenvolvimento
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Módulo de Vendas</h2>
        </div>
      </div>

      {/* Subtítulo */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
        <p className="text-sm text-indigo-800 font-medium leading-relaxed">
          Integração em desenvolvimento com a <strong>API da Takeat</strong> para alimentar relatórios,
          estoque, CMV e análises futuras. Interface e estrutura criadas — dados reais serão puxados
          após configuração das credenciais.
        </p>
      </div>

      {/* ── BLOCO B — STATUS DA INTEGRAÇÃO ─────────────────────── */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">
          Status da Integração
        </h3>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-2">
          <StatusBadge label="Autenticação via JWT identificada" ok={true} />
          <StatusBadge label="Endpoint /table-sessions confirmado" ok={true} />
          <StatusBadge label="Estrutura do retorno estudada" ok={true} />
          <StatusBadge label="Endpoints /payment-methods e /products confirmados" ok={true} />
          <StatusBadge label="Janela máxima por consulta: 3 dias" ok={true} />
          <StatusBadge label="Timezone da API: UTC-0 (tratamento Brasília pendente)" ok={false} />
          <StatusBadge label="Credenciais de produção configuradas" ok={false} />
          <StatusBadge label="Sincronização real com banco de dados" ok={false} />
        </div>
        <div className="mt-2 flex items-center gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-gray-500">Confirmado</span>
          </div>
          <span className="text-gray-300">·</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-gray-500">Pendente</span>
          </div>
        </div>
      </section>

      {/* ── BLOCO C — DADOS CONFIRMADOS ────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">
          Dados Confirmados para Ingestão
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Utensils, label: 'Sessões / Comandas' },
            { icon: FileText, label: 'Contas individuais' },
            { icon: ShoppingCart, label: 'Cestas de pedido' },
            { icon: Package, label: 'Pedidos e itens vendidos' },
            { icon: CreditCard, label: 'Pagamentos' },
            { icon: Layers, label: 'Métodos de pagamento' },
            { icon: Package, label: 'Produtos e complementos' },
            { icon: FileText, label: 'NFC-e quando disponível' },
            { icon: Wifi, label: 'Canal de origem' },
            { icon: Truck, label: 'Comprador / cliente' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <span className="text-xs font-medium text-gray-700 leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── BLOCO D — FLUXO DO MÓDULO ──────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">
          Fluxo do Módulo
        </h3>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <FlowStep
            icon={Zap}
            label="Takeat API"
            sub="Autenticação JWT · /table-sessions · janela 3 dias · UTC-0"
          />
          <FlowStep
            icon={Layers}
            label="Ingestão Bruta (raw)"
            sub="Armazenamento do retorno original sem transformação"
          />
          <FlowStep
            icon={BarChart3}
            label="Normalização"
            sub="Mapeamento para modelo interno — sessões, itens, pagamentos"
          />
          <FlowStep
            icon={TrendingUp}
            label="Relatórios de Vendas"
            sub="Visão gerencial por período, canal, produto e método"
          />
          <FlowStep
            icon={Package}
            label="Cruzamento com Estoque / CMV"
            sub="Consumo teórico × contagem × venda para fechar o ciclo"
          />
          <FlowStep
            icon={Zap}
            label="Análise por IA"
            sub="Alertas, tendências e insights automáticos"
            isLast
          />
        </div>
      </section>

      {/* ── BLOCO E — RESUMO DEMONSTRATIVO ─────────────────────── */}
      <section>
        <div className="flex items-center gap-2 pl-1 mb-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Resumo do Período
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wider">
            Mock · {MOCK_PERIOD.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Sessões / Comandas"
            value={String(MOCK_SUMMARY.total_sessions)}
            sub="no período"
            color="indigo"
          />
          <SummaryCard
            label="Itens vendidos"
            value={String(MOCK_SUMMARY.total_products_sold)}
            sub="produtos distintos"
            color="indigo"
          />
          <SummaryCard
            label="Total produtos"
            value={formatMoney(MOCK_SUMMARY.total_revenue)}
            sub="sem serviço"
            color="emerald"
          />
          <SummaryCard
            label="Total com serviço"
            value={formatMoney(MOCK_SUMMARY.total_with_service)}
            sub="inc. 10%"
            color="emerald"
          />
          <SummaryCard
            label="Pagamentos"
            value={String(MOCK_SUMMARY.total_payments)}
            sub="registros"
            color="gray"
          />
          <SummaryCard
            label="Canais"
            value={String(MOCK_SUMMARY.channels_found.length)}
            sub={MOCK_SUMMARY.channels_found.join(', ')}
            color="gray"
          />
          <SummaryCard
            label="Descontos"
            value={formatMoney(MOCK_SUMMARY.total_discounts)}
            sub="encontrados"
            color="amber"
          />
          <SummaryCard
            label="NFC-e"
            value={String(MOCK_SUMMARY.nfce_available)}
            sub="disponíveis"
            color="gray"
          />
        </div>
      </section>

      {/* ── BLOCO F — TABELA DEMONSTRATIVA ─────────────────────── */}
      <section>
        <div className="flex items-center gap-2 pl-1 mb-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Sessões do Período
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wider">
            Mock
          </span>
        </div>

        <div className="space-y-3">
          {visibleSessions.map((s) => {
            const bill = s.bills[0]
            const totalProducts = parseFloat(bill?.total_price ?? '0')
            const totalService = parseFloat(bill?.total_service_price ?? '0')
            const discount = parseFloat(bill?.total_discount ?? '0')
            const paymentNames = s.payments.map(p => p.payment_method.name).join(', ')
            const itemCount = bill?.order_baskets.flatMap(b => b.orders).reduce((acc, o) => acc + o.order_products.length, 0) ?? 0

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"
              >
                {/* Linha 1 — comanda, canal, status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{s.key}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg">
                      {s.channel.name}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      s.status === 'finished'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {s.status === 'finished' ? 'Fechada' : 'Aberta'}
                    </span>
                  </div>
                </div>

                {/* Linha 2 — números */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center">
                  <div>
                    <p className="text-xs text-gray-400">Produtos</p>
                    <p className="text-sm font-bold text-gray-800">{formatMoney(totalProducts)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">c/ Serviço</p>
                    <p className="text-sm font-bold text-gray-800">{formatMoney(totalService)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Itens</p>
                    <p className="text-sm font-bold text-gray-800">{itemCount}</p>
                  </div>
                </div>

                {/* Linha 3 — pagamento, cliente, desconto */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                  {paymentNames && (
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> {paymentNames}
                    </span>
                  )}
                  {(s.buyer?.name || s.waiter?.name) && (
                    <span className="flex items-center gap-1">
                      <Utensils className="w-3 h-3" />
                      {s.buyer?.name ?? `Atendente: ${s.waiter?.name}`}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-semibold">
                      <AlertCircle className="w-3 h-3" /> Desc. {formatMoney(discount)}
                    </span>
                  )}
                  {s.nfce && (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <FileText className="w-3 h-3" /> NFC-e #{s.nfce.number}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {MOCK_SESSIONS.length > 3 && (
          <button
            onClick={() => setTableExpanded(v => !v)}
            className="w-full mt-3 py-3 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 transition active:scale-95"
          >
            {tableExpanded
              ? <><ChevronUp className="w-4 h-4" /> Recolher</>
              : <><ChevronDown className="w-4 h-4" /> Ver mais {MOCK_SESSIONS.length - 3} sessões</>
            }
          </button>
        )}
      </section>

      {/* ── BLOCO G — PRÓXIMOS USOS NO SISTEMA ─────────────────── */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">
          O que este módulo vai alimentar
        </h3>
        <div className="space-y-2">
          {[
            {
              label: 'Cruzamento com Estoque',
              sub: 'Venda real → consumo teórico → divergência',
              color: 'bg-indigo-50 border-indigo-100',
              text: 'text-indigo-700',
              icon: Package,
            },
            {
              label: 'Análise de CMV',
              sub: 'Custo da mercadoria vendida por produto e por período',
              color: 'bg-purple-50 border-purple-100',
              text: 'text-purple-700',
              icon: BarChart3,
            },
            {
              label: 'Mix de Vendas',
              sub: 'Quais produtos vendem mais, em quais canais e horários',
              color: 'bg-emerald-50 border-emerald-100',
              text: 'text-emerald-700',
              icon: TrendingUp,
            },
            {
              label: 'Análise por Canal',
              sub: 'Mesa vs. Balcão vs. Delivery — comparativo de ticket',
              color: 'bg-blue-50 border-blue-100',
              text: 'text-blue-700',
              icon: Wifi,
            },
            {
              label: 'Leitura de Descontos',
              sub: 'Impacto financeiro dos descontos concedidos por período',
              color: 'bg-amber-50 border-amber-100',
              text: 'text-amber-700',
              icon: AlertCircle,
            },
            {
              label: 'IA Gerencial',
              sub: 'Alertas automáticos, tendências e sugestões operacionais',
              color: 'bg-rose-50 border-rose-100',
              text: 'text-rose-700',
              icon: Zap,
            },
          ].map(({ label, sub, color, text, icon: Icon }) => (
            <div
              key={label}
              className={`flex items-center gap-3 p-4 rounded-xl border ${color}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${text}`} />
              <div>
                <p className={`text-sm font-bold ${text}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
              </div>
              <ArrowRight className={`w-4 h-4 ml-auto shrink-0 ${text} opacity-40`} />
            </div>
          ))}
        </div>
      </section>

      {/* ── RODAPÉ TÉCNICO ─────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Módulo de Vendas · Estrutura inicial · Dados mockados para demonstração<br />
          Integração real: plugar <code className="font-mono bg-gray-100 px-1 rounded">TakeatService</code> com credenciais em <code className="font-mono bg-gray-100 px-1 rounded">.env.local</code>
        </p>
      </div>

    </div>
  )
}
