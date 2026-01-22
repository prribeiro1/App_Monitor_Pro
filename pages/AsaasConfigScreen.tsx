import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { asaasService } from '../services/asaasService';

interface AsaasConfigScreenProps {
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const AsaasConfigScreen: React.FC<AsaasConfigScreenProps> = ({ onSave, initialConfig }) => {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>(initialConfig?.environment || 'sandbox');
  const [enabled, setEnabled] = useState(initialConfig?.enabled || false);
  const [autoNegativationDays, setAutoNegativationDays] = useState(initialConfig?.autoNegativationDays || 30);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = async () => {
    if (!apiKey) {
      alert('Informe a API Key primeiro');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      asaasService.setApiKey(apiKey, environment);
      
      // Testa a conexão listando clientes
      const response = await fetch(
        environment === 'production' 
          ? 'https://api.asaas.com/v3/customers?limit=1'
          : 'https://sandbox.asaas.com/api/v3/customers?limit=1',
        {
          headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey
          }
        }
      );

      if (response.ok) {
        setTestResult('✅ Conexão bem-sucedida! API Key válida.');
      } else {
        const error = await response.json();
        setTestResult(`❌ Erro: ${error.errors?.[0]?.description || 'API Key inválida'}`);
      }
    } catch (error) {
      setTestResult('❌ Erro ao conectar com Asaas. Verifique sua conexão.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!apiKey && enabled) {
      alert('Informe a API Key para ativar a integração');
      return;
    }

    const config = {
      apiKey,
      environment,
      enabled,
      autoNegativationDays
    };

    asaasService.setApiKey(apiKey, environment);
    onSave(config);
    alert('✅ Configurações salvas com sucesso!');
  };

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Configuração Asaas</h2>
        <p className="text-gray-400 text-sm">
          Configure a integração com Asaas para cobrança automática e negativação
        </p>
      </div>

      {/* Card de Informações */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Icon name="info" className="text-blue-400 mt-1" size={20} />
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-blue-400 mb-2">Como funciona?</p>
            <ul className="space-y-1 text-xs">
              <li>• Gera cobranças automáticas via PIX, Boleto ou Cartão</li>
              <li>• Envia notificações automáticas aos responsáveis</li>
              <li>• Negativação automática após X dias de atraso</li>
              <li>• Você recebe direto na sua conta Asaas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ativar/Desativar */}
      <div className="bg-navy-800 rounded-xl p-6 mb-4 border border-navy-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold">Ativar Integração</h3>
            <p className="text-gray-400 text-sm">Habilitar cobrança automática via Asaas</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-7 rounded-full transition ${
              enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                enabled ? 'translate-x-7' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Ambiente */}
      <div className="bg-navy-800 rounded-xl p-6 mb-4 border border-navy-700">
        <label className="block text-white font-semibold mb-3">Ambiente</label>
        <div className="flex gap-3">
          <button
            onClick={() => setEnvironment('sandbox')}
            className={`flex-1 py-3 rounded-lg font-medium transition ${
              environment === 'sandbox'
                ? 'bg-yellow-600 text-white'
                : 'bg-navy-900 text-gray-400 border border-navy-700'
            }`}
          >
            🧪 Sandbox (Testes)
          </button>
          <button
            onClick={() => setEnvironment('production')}
            className={`flex-1 py-3 rounded-lg font-medium transition ${
              environment === 'production'
                ? 'bg-green-600 text-white'
                : 'bg-navy-900 text-gray-400 border border-navy-700'
            }`}
          >
            🚀 Produção
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {environment === 'sandbox' 
            ? 'Use Sandbox para testar sem cobranças reais'
            : 'Produção processa cobranças reais'}
        </p>
      </div>

      {/* API Key */}
      <div className="bg-navy-800 rounded-xl p-6 mb-4 border border-navy-700">
        <label className="block text-white font-semibold mb-3">
          API Key do Asaas
          <span className="text-red-400 ml-1">*</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwMDAwMDA6OiRhYWNoXzAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMA=="
          className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg outline-none focus:border-primary-500 text-sm font-mono"
        />
        <div className="flex items-start gap-2 mt-3">
          <Icon name="info" className="text-gray-500 mt-0.5" size={14} />
          <p className="text-xs text-gray-500">
            Obtenha sua API Key em: Asaas → Integrações → API Key
          </p>
        </div>
        
        {/* Botão de Teste */}
        <button
          onClick={handleTest}
          disabled={testing || !apiKey}
          className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
        >
          {testing ? (
            <>
              <Icon name="loader" className="animate-spin" size={18} />
              Testando...
            </>
          ) : (
            <>
              <Icon name="zap" size={18} />
              Testar Conexão
            </>
          )}
        </button>

        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            testResult.startsWith('✅') 
              ? 'bg-green-900/30 border border-green-500/30 text-green-400'
              : 'bg-red-900/30 border border-red-500/30 text-red-400'
          }`}>
            {testResult}
          </div>
        )}
      </div>

      {/* Negativação Automática */}
      <div className="bg-navy-800 rounded-xl p-6 mb-6 border border-navy-700">
        <label className="block text-white font-semibold mb-3">
          Negativação Automática (Serasa/SPC)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={autoNegativationDays}
            onChange={(e) => setAutoNegativationDays(Number(e.target.value))}
            min="15"
            max="90"
            className="w-24 bg-navy-900 border border-navy-700 text-white p-3 rounded-lg outline-none focus:border-primary-500 text-center font-bold"
          />
          <span className="text-gray-400">dias de atraso</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Após {autoNegativationDays} dias de atraso, o sistema enviará automaticamente para negativação
        </p>
      </div>

      {/* Botão Salvar */}
      <button
        onClick={handleSave}
        className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg"
      >
        <Icon name="save" size={20} />
        Salvar Configurações
      </button>

      {/* Link para criar conta */}
      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm mb-2">Ainda não tem conta no Asaas?</p>
        <a
          href="https://www.asaas.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          Criar conta gratuita →
        </a>
      </div>
    </div>
  );
};
