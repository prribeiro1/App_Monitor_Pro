import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { asaasService } from '../services/asaasService';
import { dbService } from '../services/db';
import { UserSettings } from '../types';

interface OnboardingBankScreenProps {
  settings: UserSettings | null;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingBankScreen: React.FC<OnboardingBankScreenProps> = ({ settings, onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  return <div>Onboarding</div>;
};
