import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { PlanSelectionScreen } from './PlanSelectionScreen';
import { OnboardingBankScreen } from './OnboardingBankScreen';
import { SubscriptionTier, UserSettings } from '../types';
import { dbService } from '../services/db';
import { supabase } from '../services/auth';
import { asaasService } from '../services/asaasService';

interface WelcomeScreenProps {
  settings: UserSettings | null;
  onComplete: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ settings, onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'plan'>('welcome');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);

  const handleStart = () => {
    setStep('plan');
  };

  const handlePlanSelected = async (tier: SubscriptionTier, price?: number) => {
    if (tier === 'basic') {
      setSelectedPlan(tier);
      const updatedSettings: UserSettings = { ...settings!, subscriptionTier: tier };
      await dbService.saveUserSettings(updatedSettings);
      onComplete();
      return;
    }

    try {
      // Inicia fluxo de pagamento para Pro/Pro+
      alert("Iniciando processo de assinatura... Você será redirecionado para o checkout do Asaas.");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const driverName = settings?.driverName || user.user_metadata?.full_name || 'Motorista';
      const driverEmail = settings?.driverEmail || user.email!;
      const driverCpf = settings?.driverCpf;

      if (!driverCpf) {
        alert("Por favor, preencha seu CPF no perfil antes de assinar um plano Pro.");
        setStep('welcome'); // Ou redirecionar para perfil
        return;
      }

      // 1. Buscar ou Criar Cliente no Asaas
      let customerId = '';
      try {
        const search = await asaasService.getCustomerByCpf(driverCpf);
        if (search.data && search.data.length > 0) {
          customerId = search.data[0].id;
        } else {
          const customer = await asaasService.createCustomer({
            name: driverName,
            cpfCnpj: driverCpf,
            email: driverEmail
          });
          customerId = customer.id;
        }
      } catch (cError: any) {
        throw new Error(`Erro ao gerenciar cliente no Asaas: ${cError.message}`);
      }

      if (!customerId) throw new Error("Não foi possível obter um ID de cliente no Asaas.");

      // 2. Criar Assinatura do App (Sem Split, pois é pra nós)
      const value = price || (tier === 'pro_plus' ? 24.90 : 14.90);
      const description = `Plano ${tier.toUpperCase()} - Van Pro`;

      const subscription = await asaasService.createSubscription({
        customer: customerId,
        billingType: 'UNDEFINED', // Deixa o cliente escolher no checkout
        value: value,
        nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias de trial
        cycle: 'MONTHLY',
        description: description,
        externalReference: `subscription:${user.id}`
      });

      // A função proxy agora tenta anexar o invoiceUrl aqui
      if (subscription && (subscription.invoiceUrl || subscription.checkoutUrl)) {
        const paymentUrl = subscription.invoiceUrl || subscription.checkoutUrl;

        // Abrir link de pagamento
        window.open(paymentUrl, '_blank');

        // Salvar intenção de plano localmente
        const updatedSettings: UserSettings = { ...settings!, subscriptionTier: tier };
        await dbService.saveUserSettings(updatedSettings);

        alert("Seu link de assinatura foi gerado! Você será redirecionado para o checkout. Após o pagamento, seu plano será ativado automaticamente.");

        onComplete();
      } else {
        console.error("Assinatura criada mas link ausente:", subscription);
        throw new Error("Assinatura criada, mas o link de pagamento não foi retornado. Por favor, tente novamente em instantes ou contate o suporte.");
      }

    } catch (error: any) {
      console.error("Erro ao processar assinatura:", error);
      alert(`Erro: ${error.message || 'Falha na comunicação com Asaas'}`);
    }
  };

  const handleBankComplete = () => {
    onComplete();
  };

  const handleBankSkip = () => {
    onComplete();
  };

  if (step === 'plan') {
    return <PlanSelectionScreen onSelectPlan={handlePlanSelected} />;
  }



  // Welcome Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex flex-col items-center justify-center p-6 relative">
      {/* Botão Voltar (Para quem já está logado) */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-all z-50 mr-[env(safe-area-inset-right)] mt-[env(safe-area-inset-top)]"
        title="Voltar para o Dashboard"
      >
        <Icon name="x" size={24} />
      </button>

      <div className="max-w-md w-full text-center">
        {/* Logo/Icon */}
        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <Icon name="face" size={48} className="text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Bem-vindo ao Van Pro! 🚀
        </h1>
        <p className="text-gray-400 mb-8">
          A solução completa para gestão de transporte escolar
        </p>

        {/* Features */}
        <div className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-navy-700">
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-left">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name="map" size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Rotas e GPS</h3>
                <p className="text-gray-400 text-sm">Gerencie rotas e navegue com facilidade</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name="users" size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Gestão de Alunos</h3>
                <p className="text-gray-400 text-sm">Cadastro completo e chamada digital</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name="dollar-sign" size={20} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Financeiro</h3>
                <p className="text-gray-400 text-sm">Controle de pagamentos e relatórios</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name="file-text" size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Contratos e PDFs</h3>
                <p className="text-gray-400 text-sm">Gere contratos e relatórios profissionais</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          Começar Agora
          <Icon name="arrow-right" size={20} />
        </button>

        <p className="text-gray-500 text-xs mt-4">
          7 dias de teste grátis • Cancele quando quiser
        </p>
      </div>
    </div>
  );
};
