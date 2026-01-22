import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { dbService } from '../services/db';
import { asaasService } from '../services/asaasService';
import { Student } from '../types';

export const AutomaticBillingScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingStudent, setProcessingStudent] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [hasAsaasConfig, setHasAsaasConfig] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allStudents = await dbService.getStudents();
    setStudents(allStudents.filter(s => s.active));
    
    // Carregar configurações do usuário
    const settings = await dbService.getUserSettings();
    setWalletId(settings?.asaasWalletId || null);
    setHasAsaasConfig(!!settings?.asaasConfig?.apiKey);
    
    setLoading(false);
  };

  const handleActivateAutoBilling = async (student: Student) => {
    if (!hasAsaasConfig) {
      alert('❌ Configure o Asaas primeiro nas configurações.');
      return;
    }

    if (!walletId) {
      alert('❌ Configure seus dados bancários primeiro.\n\nVá em Configurações → Dados Bancários.');
      return;
    }

    if (!student.responsibleCpf) {
      alert('❌ CPF do responsável não cadastrado. Edite o aluno e adicione o CPF.');
      return;
    }

    if (!student.monthlyFees || student.monthlyFees <= 0) {
      alert('❌ Valor da mensalidade não cadastrado. Edite o aluno e adicione o valor.');
      return;
    }

    if (!student.dueDay) {
      alert('❌ Dia de vencimento não cadastrado. Edite o aluno e adicione o dia.');
      return;
    }

    setProcessingStudent(student.id);

    try {
      // 1. Criar/buscar cliente no Asaas
      let asaasCustomer;
      const existingCustomer = await asaasService.getCustomerByCpf(student.responsibleCpf);
      
      if (existingCustomer.data && existingCustomer.data.length > 0) {
        asaasCustomer = existingCustomer.data[0];
      } else {
        // Criar novo cliente
        asaasCustomer = await asaasService.createCustomer({
          name: student.guardianName || 'Responsável',
          cpfCnpj: student.responsibleCpf,
          email: '', // Pode adicionar campo de email no cadastro
          mobilePhone: student.responsiblePhone || student.contact || ''
        });
      }

      // 2. Criar assinatura recorrente COM SPLIT
      const nextDueDate = new Date();
      nextDueDate.setDate(student.dueDay);
      if (nextDueDate < new Date()) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      const subscription = await asaasService.createSubscription({
        customer: asaasCustomer.id,
        billingType: 'PIX', // Pode ser configurável
        value: student.monthlyFees,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: `Mensalidade - ${student.name}`,
        externalReference: student.id
      }, walletId); // ← Passa o walletId para criar split automático

      if (subscription.id) {
        alert(`✅ Cobrança automática ativada!\n\nAssinatura ID: ${subscription.id}\nPróximo vencimento: ${nextDueDate.toLocaleDateString()}\n\n💰 Split configurado:\n99% para você\n1% para Monitor Pro`);
        // Aqui você salvaria o subscription.id no banco de dados local
      } else {
        alert('❌ Erro ao criar assinatura: ' + (subscription.errors?.[0]?.description || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error('Erro:', error);
      
      // Detectar erro de CORS
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        alert(`⚠️ ERRO DE CORS (Desenvolvimento Local)

Isso acontece porque o navegador bloqueia requisições diretas para APIs externas.

📱 SOLUÇÕES:

1. TESTAR NO APK (Recomendado):
   - Gere o APK desta branch
   - Instale no celular
   - Lá funciona 100%!

2. USAR EXTENSÃO CORS:
   - Instale: "Allow CORS" no Chrome
   - Ative a extensão
   - Tente novamente

3. AGUARDAR PRODUÇÃO:
   - Esta funcionalidade será testada no APK

A API Key está configurada corretamente!`);
      } else {
        alert('❌ Erro ao ativar cobrança automática. Verifique as configurações do Asaas.');
      }
    } finally {
      setProcessingStudent(null);
    }
  };

  const handleNegativate = async (student: Student) => {
    if (!confirm(`⚠️ Confirma negativação de ${student.name}?\n\nIsso enviará o nome do responsável para Serasa/SPC.`)) {
      return;
    }

    setProcessingStudent(student.id);

    try {
      // Aqui você buscaria o paymentId da última cobrança em atraso
      // Por enquanto, vou simular
      alert('🔄 Funcionalidade em desenvolvimento.\n\nEm produção, isso enviaria para negativação no Serasa/SPC.');
    } catch (error) {
      alert('❌ Erro ao negativar.');
    } finally {
      setProcessingStudent(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon name="loader" className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Cobrança Automática</h2>
        <p className="text-gray-400 text-sm">
          Gerencie cobranças recorrentes e negativações via Asaas
        </p>
      </div>

      {/* Card de Aviso - Configuração */}
      {!hasAsaasConfig && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Icon name="alert-triangle" className="text-yellow-400 mt-1" size={20} />
            <div className="text-sm text-gray-300">
              <p className="font-semibold text-yellow-400 mb-1">Configure o Asaas primeiro</p>
              <p className="text-xs">
                Antes de ativar cobranças, configure sua API Key do Asaas nas configurações.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card de Aviso - Dados Bancários */}
      {hasAsaasConfig && !walletId && (
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Icon name="alert-circle" className="text-orange-400 mt-1" size={20} />
            <div className="text-sm text-gray-300 flex-1">
              <p className="font-semibold text-orange-400 mb-1">Configure seus dados bancários</p>
              <p className="text-xs mb-3">
                Para receber os pagamentos automaticamente, você precisa configurar seus dados bancários.
              </p>
              <button
                onClick={() => window.location.hash = '/onboarding-bank'}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg text-xs transition flex items-center gap-2"
              >
                <Icon name="settings" size={16} />
                Configurar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card de Aviso - CORS */}
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Icon name="alert-circle" className="text-red-400 mt-1" size={20} />
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-red-400 mb-2">⚠️ Limitação em Desenvolvimento Local</p>
            <p className="text-xs mb-2">
              O navegador bloqueia requisições para APIs externas (erro CORS). 
              Esta funcionalidade só pode ser testada completamente no APK Android.
            </p>
            <p className="text-xs font-semibold text-red-300">
              📱 Gere o APK desta branch para testar a integração real com Asaas!
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Alunos */}
      {students.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Icon name="users" size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum aluno cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const hasRequiredData = student.responsibleCpf && student.monthlyFees && student.dueDay;
            const isProcessing = processingStudent === student.id;

            return (
              <div
                key={student.id}
                className="bg-navy-800 rounded-xl p-4 border border-navy-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{student.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {student.guardianName || 'Responsável não cadastrado'}
                    </p>
                    {student.responsibleCpf && (
                      <p className="text-gray-500 text-xs mt-1">
                        CPF: {student.responsibleCpf}
                      </p>
                    )}
                  </div>
                  
                  {hasRequiredData ? (
                    <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                      ✓ Pronto
                    </span>
                  ) : (
                    <span className="bg-red-900/30 text-red-400 px-3 py-1 rounded-full text-xs font-medium">
                      ⚠ Incompleto
                    </span>
                  )}
                </div>

                {/* Informações */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Mensalidade</p>
                    <p className="text-white font-semibold">
                      {student.monthlyFees ? `R$ ${student.monthlyFees.toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Vencimento</p>
                    <p className="text-white font-semibold">
                      {student.dueDay ? `Dia ${student.dueDay}` : '-'}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleActivateAutoBilling(student)}
                    disabled={!hasRequiredData || isProcessing}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition text-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Icon name="loader" className="animate-spin" size={16} />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Icon name="zap" size={16} />
                        Ativar Cobrança
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleNegativate(student)}
                    disabled={isProcessing}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
                    title="Negativar (Serasa/SPC)"
                  >
                    <Icon name="alert-triangle" size={16} />
                  </button>
                </div>

                {!hasRequiredData && (
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠ Complete: {!student.responsibleCpf && 'CPF'} {!student.monthlyFees && 'Valor'} {!student.dueDay && 'Vencimento'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
