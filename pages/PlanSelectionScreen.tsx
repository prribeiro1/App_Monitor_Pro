import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { SubscriptionTier, PlanPrices } from '../types';
import { cloudSync } from '../services/cloudSync';
import { formatCurrency } from '../utils';

interface PlanSelectionScreenProps {
  onSelectPlan: (tier: SubscriptionTier, price: number) => void;
}

export const PlanSelectionScreen: React.FC<PlanSelectionScreenProps> = ({ onSelectPlan }) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);
  const [prices, setPrices] = useState<PlanPrices>({
    basic: { monthly: 0, annual: 0 },
    pro: { monthly: 15.90, annual: 159.90 },
    pro_plus: { monthly: 24.90, annual: 249.90 }
  });
  const [whatsappLink, setWhatsappLink] = useState('https://wa.me/5522999837547');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConstants = async () => {
      try {
        const constants = await cloudSync.getAppConstants();
        if (constants) {
          if (constants.plan_prices) setPrices(constants.plan_prices);
          if (constants.contact_links?.whatsapp_team) setWhatsappLink(constants.contact_links.whatsapp_team);
        }
      } catch (e) {
        console.error("Erro ao carregar preços dinâmicos:", e);
      } finally {
        setLoading(false);
      }
    };
    loadConstants();
  }, []);

  const plans = [
    {
      id: 'basic' as SubscriptionTier,
      name: 'Básico',
      price: prices.basic.monthly,
      priceAnnual: prices.basic.annual,
      color: 'from-gray-600 to-gray-700',
      icon: 'check-circle' as const,
      features: [
        'Dashboard básico',
        'Rotas e pontos',
        'Cadastro de alunos',
        'Chamada diária',
        'Suporte por email'
      ],
      notIncluded: [
        'Relatórios avançados',
        'Gestão financeira',
        'Contratos digitais',
        'Cobrança automática'
      ]
    },
    {
      id: 'pro' as SubscriptionTier,
      name: 'Pro Solo',
      price: prices.pro.monthly,
      priceAnnual: prices.pro.annual,
      color: 'from-blue-600 to-blue-700',
      icon: 'star' as const,
      badge: 'Mais Popular',
      features: [
        'Tudo do Básico',
        'Relatórios completos',
        'Gestão financeira manual',
        'Contratos digitais',
        'Manutenção de veículo',
        'GPS e navegação',
        'Lembretes automáticos',
        'Suporte prioritário'
      ],
      notIncluded: []
    },
    {
      id: 'pro_plus' as SubscriptionTier,
      name: 'Pro Duo',
      price: 0,
      priceAnnual: 0,
      color: 'from-indigo-600 to-indigo-700',
      icon: 'users' as const,
      badge: 'Até 2 Condutores',
      isWhatsapp: true, 
      features: [
        'Tudo do Pro Solo',
        'Acesso para 2 condutores',
        'Sincronização em tempo real',
        'Gestão centralizada'
      ],
      notIncluded: []
    },
    {
      id: 'pro_plus' as SubscriptionTier,
      name: 'Equipe / Frotas',
      price: 0,
      priceAnnual: 0,
      color: 'from-purple-600 to-purple-700',
      icon: 'truck' as const,
      badge: 'Empresas',
      isWhatsapp: true,
      features: [
        'Tudo do Pro Duo',
        'Painel para 3+ condutores',
        'Gestão de frota avançada',
        'Treinamento e Suporte VIP'
      ],
      notIncluded: []
    }
  ];

  const handleContinue = () => {
    if (selectedPlan) {
      const plan = plans.find(p => p.id === selectedPlan);
      if ((plan as any).isWhatsapp) {
        const message = `Olá! Gostaria de saber mais sobre o Plano ${plan?.name} do Van Escolar Pro.`;
        window.open(`${whatsappLink}?text=${encodeURIComponent(message)}`, '_blank');
        return;
      }
      onSelectPlan(selectedPlan, plan?.price || 0);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <div className="bg-navy-800 p-6 shadow-lg" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <h1 className="text-2xl font-bold text-white mb-2">Escolha seu Plano</h1>
        <p className="text-gray-400 text-sm">
          Selecione o plano ideal para sua operação
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer ${selectedPlan === plan.id
                ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
                : 'border-navy-700 bg-navy-800 hover:border-navy-600'
                }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r ${plan.color} px-4 py-1 rounded-full`}>
                  <span className="text-white text-xs font-bold">{plan.badge}</span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                    <Icon name={plan.icon} size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary-400">
                        {plan.price > 0 ? formatCurrency(plan.price) : 'Consultar'}
                      </span>
                      {plan.price > 0 && <span className="text-gray-500 text-sm">/mês</span>}
                    </div>
                  </div>
                </div>

                {/* Radio */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-600'
                  }`}>
                  {selectedPlan === plan.id && (
                    <Icon name="check" size={16} className="text-white" />
                  )}
                </div>
              </div>

              {/* Annual Price */}
              {plan.priceAnnual > 0 && (
                <div className="bg-navy-900/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-1">Plano Anual</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-green-400">{formatCurrency(plan.priceAnnual)}</span>
                    <span className="text-xs text-gray-500">/ano</span>
                    <span className="text-xs text-green-400 font-semibold">
                      (Economize {Math.round(((plan.price * 12 - plan.priceAnnual) / (plan.price * 12)) * 100)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="space-y-2">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Icon name="check" size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}

                {plan.notIncluded.length > 0 && (
                  <>
                    {plan.notIncluded.map((feature, index) => (
                      <div key={`not-${index}`} className="flex items-start gap-2 opacity-50">
                        <Icon name="x" size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-500">{feature}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Whatsapp Team Button */}
        <div className="mt-8">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-navy-800 border-2 border-dashed border-navy-600 hover:border-primary-500 transition-all group"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 group-hover:scale-110 transition">
              <Icon name="message-circle" size={24} />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Plano para Equipes?</p>
              <p className="text-gray-400 text-xs text-balance">Consulte valores para frotas de 3 a 5 motoristas.</p>
            </div>
            <Icon name="external-link" size={16} className="text-gray-600 ml-auto" />
          </a>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Todos os planos incluem 7 dias de teste grátis</p>
          <p className="mt-1">Cancele a qualquer momento, sem multa</p>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="bg-navy-800 p-4 border-t border-navy-700" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleContinue}
          disabled={!selectedPlan || loading}
          className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <Icon name="loader" className="animate-spin" />
          ) : selectedPlan ? (
            <>
              Continuar com {plans.find(p => p.id === selectedPlan)?.name}
              <Icon name="arrow-right" size={20} />
            </>
          ) : (
            'Selecione um plano'
          )}
        </button>
      </div>
    </div>
  );
};
