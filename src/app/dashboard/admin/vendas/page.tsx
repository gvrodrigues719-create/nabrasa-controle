'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { checkTakeatConfigAction } from '@/app/actions/takeatAction'
import {
  ArrowLeft, Zap, CheckCircle2, Clock, AlertCircle,
  ShoppingCart, CreditCard, FileText, Package,
  TrendingUp, ArrowRight, BarChart3, Layers,
  Utensils, Wifi, Truck, ChevronDown, ChevronUp,
  CalendarSync
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
  
  // Estados para Cronograma e Config
  const [isConfigured, setIsConfigured] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)
  
  // Estados para o Seletor de Datas (Inicializados com o Mock)
  const [startDate, setStartDate] = useState(MOCK_PERIOD.start.split('T')[0])
  const [endDate, setEndDate] = useState(MOCK_PERIOD.end.split('T')[0])
  const [dateError, setDateError] = useState<string | null>(null)

  useEffect(() => {
    async function checkConfig() {
      try {
        const configured = await checkTakeatConfigAction()
        setIsConfigured(configured)
      } catch (err) {
        console.error("Falha ao verificar config Takeat:", err)
      } finally {
        setLoadingConfig(false)
      }
    }
    checkConfig()
  }, [])

  // Validação de 3 dias (Regra Takeat)
  useEffect(() => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 3) {
      setDateError("A API Takeat permite no máximo 3 dias por consulta.")
    } else if (end < start) {
      setDateError("A data final deve ser posterior à inicial.")
    } else {
      setDateError(null)
    }
  }, [startDate, endDate])

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
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Analytics</p>
            {isConfigured ? (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">
                Conectado
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wider">
                Configuração Pendente
              </span>
            )}
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Módulo de Vendas</h2>
        </div>
      </div>

      {/* Subtítulo Executivo */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
        <p className="text-sm text-indigo-800 font-medium leading-relaxed">
          Visão consolidada do faturamento e performance via <strong>Integração Takeat</strong>. 
          Consulte períodos, acompanhe tickets e prepare o cruzamento com seu estoque real.
        </p>
      </div>

      {/* ── SELETOR DE PERÍODO (AJUSTE INCREMENTAL) ──────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarSync className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Consultar Período</h3>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Janela: 3 Dias</span>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {dateError ? (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-xs font-bold text-rose-700">{dateError}</p>
            </div>
          ) : (
            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
              <BarChart3 className="w-4 h-4" /> Atualizar Dashboard (Mock)
            </button>
          )}
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
