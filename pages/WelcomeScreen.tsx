import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { PlanSelectionScreen } from './PlanSelectionScreen';
import { OnboardingBankScreen } from './OnboardingBankScreen';
import { SubscriptionTier, UserSettings } from '../types';
import { dbService } from '../services/db';

interface WelcomeScreenProps {
  settings: UserSettings | null;
  onComplete: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ settings, onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'plan' | 'bank'>('welcome');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);

  const handleStart = () => {
    setStep('plan');
  };

  const handlePlanSelected = async (tier: SubscriptionTier) => {
    setSelectedPlan(tier);
    
    // Salvar plano no banco
    const updatedSettings: UserSettings = {
      ...settings!,
      subscriptionTier: tier
    };
    await dbService.saveUserSettings(updatedSettings);

    // Se escolheu Pro+, vai para onboarding bancário
    if (tier === 'pro_plus') {
      setStep('bank');
    } else {
      // Outros planos, finaliza
      onComplete();
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

  if (step === 'bank') {
    return (
      <OnboardingBankScreen
        settings={settings}
        onComplete={handleBankComplete}
        onSkip={handleBankSkip}
      />
    );
  }

  // Welcome Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo/Icon */}
        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <Icon name="face" size={48} className="text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Bem-vindo ao Monitor Pro! 🚀
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
                <Icon name="zap" size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Cobrança Automática</h3>
                <p className="text-gray-400 text-sm">Receba automaticamente com split (Pro+)</p>
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
