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
  const [error, setError] = useState('');

  // Etapa 1: Dados Pessoais
  const [name, setName] = useState(settings?.monitorName || '');
  const [cpf, setCpf] = useState(settings?.monitorCpf || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(settings?.monitorPhone || '');

  // Etapa 2: Dados Bancários
  const [bank, setBank] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [accountDigit, setAccountDigit] = useState('');
  const [accountType, setAccountType] = useState<'CONTA_CORRENTE' | 'CONTA_POUPANCA'>('CONTA_CORRENTE');

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const validateStep1 = () => {
    if (!name.trim()) return 'Preencha seu nome completo';
    if (cpf.replace(/\D/g, '').length !== 11) return 'CPF inválido';
    if (!email.includes('@')) return 'Email inválido';
    if (phone.replace(/\D/g, '').length < 10) return 'Telefone inválido';
    return null;
  };

  const validateStep2 = () => {
    if (!bank.trim()) return 'Selecione seu banco';
    if (!agency.trim()) return 'Preencha a agência';
    if (!account.trim()) return 'Preencha a conta';
    if (!accountDigit.trim()) return 'Preencha o dígito';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Criar subconta no Asaas
      const accountData = {
        name,
        email,
        cpfCnpj: cpf.replace(/\D/g, ''),
        phone: phone.replace(/\D/g, ''),
        mobilePhone: phone.replace(/\D/g, ''),
        companyType: 'INDIVIDUAL' as const,
        bankAccount: {
          bank,
          accountName: name,
          ownerName: name,
          ownerBirthDate: '1990-01-01', // TODO: Coletar data de nascimento
          cpfCnpj: cpf.replace(/\D/g, ''),
          agency,
          account,
          accountDigit,
          bankAccountType: accountType
        }
      };

      const result = await asaasService.createAccount(accountData);

      if (result?.id) {
        // Salvar walletId nas configurações
        const updated = {
          ...settings,
          monitorName: name,
          monitorCpf: cpf,
          monitorPhone: phone,
          asaasWalletId: result.id
        } as UserSettings;

        await dbService.saveUserSettings(updated);
        onComplete();
      } else {
        throw new Error('Não foi possível criar a subconta');
      }
    } catch (err: any) {
      console.error('Erro no onboarding:', err);
      setError(err.message || 'Erro ao configurar conta bancária');
    } finally {
      setLoading(false);
    }
  };

  const banks = [
    { code: '001', name: 'Banco do Brasil' },
    { code: '033', name: 'Santander' },
    { code: '104', name: 'Caixa Econômica' },
    { code: '237', name: 'Bradesco' },
    { code: '341', name: 'Itaú' },
    { code: '077', name: 'Inter' },
    { code: '260', name: 'Nubank' },
    { code: '336', name: 'C6 Bank' },
    { code: '756', name: 'Sicoob' },
    { code: '748', name: 'Sicredi' },
    { code: '212', name: 'Original' },
    { code: '422', name: 'Safra' },
  ];

  return (
    <div className="min-h-screen bg-navy-900 text-white p-6 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Configurar Recebimentos</h1>
          <p className="text-gray-400 text-sm mt-1">Etapa {step} de 2</p>
        </div>
        <button onClick={onSkip} className="text-gray-400 hover:text-white">
          Pular
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-primary-500' : 'bg-navy-700'}`} />
        <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-primary-500' : 'bg-navy-700'}`} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Dados Pessoais */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-navy-800 p-6 rounded-2xl border border-navy-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                <Icon name="user" size={20} className="text-primary-500" />
              </div>
              <div>
                <h2 className="font-bold">Dados Pessoais</h2>
                <p className="text-gray-400 text-sm">Para criar sua conta de recebimentos</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome como no documento"
                  className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={e => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            Continuar
            <Icon name="arrow-right" size={20} />
          </button>
        </div>
      )}

      {/* Step 2: Dados Bancários */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-navy-800 p-6 rounded-2xl border border-navy-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Icon name="credit-card" size={20} className="text-green-500" />
              </div>
              <div>
                <h2 className="font-bold">Dados Bancários</h2>
                <p className="text-gray-400 text-sm">Onde você receberá os pagamentos</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Banco</label>
                <select
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                >
                  <option value="">Selecione seu banco</option>
                  {banks.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Agência</label>
                  <input
                    type="text"
                    value={agency}
                    onChange={e => setAgency(e.target.value.replace(/\D/g, ''))}
                    placeholder="0000"
                    maxLength={5}
                    className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Tipo</label>
                  <select
                    value={accountType}
                    onChange={e => setAccountType(e.target.value as any)}
                    className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                  >
                    <option value="CONTA_CORRENTE">Corrente</option>
                    <option value="CONTA_POUPANCA">Poupança</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 uppercase font-bold">Conta</label>
                  <input
                    type="text"
                    value={account}
                    onChange={e => setAccount(e.target.value.replace(/\D/g, ''))}
                    placeholder="00000000"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Dígito</label>
                  <input
                    type="text"
                    value={accountDigit}
                    onChange={e => setAccountDigit(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    maxLength={2}
                    className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl mt-1 outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-navy-800 border border-navy-700 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Icon name="arrow-left" size={20} />
              Voltar
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Icon name="loader" size={20} className="animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Icon name="check" size={20} />
                  Finalizar
                </>
              )}
            </button>
          </div>

          <p className="text-center text-gray-500 text-xs mt-4">
            Seus dados são enviados com segurança para o Asaas, nossa plataforma de pagamentos parceira.
          </p>
        </div>
      )}
    </div>
  );
};
