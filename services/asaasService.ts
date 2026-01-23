// Serviço de integração com Asaas API - Modelo Split de Pagamento
// Documentação: https://docs.asaas.com
import { supabase } from './auth';

interface AsaasConfig {
    apiKey: string;
    environment: 'sandbox' | 'production';
    splitPercentage: number; // Percentual que fica com você (ex: 1 = 1%)
}

interface AsaasCustomer {
    id?: string;
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    postalCode?: string;
}

// Subconta (Wallet) para o condutor
interface AsaasAccount {
    id?: string;
    name: string;
    email: string;
    cpfCnpj: string;
    companyType?: 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION';
    phone?: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    postalCode?: string;
    bankAccount?: {
        bank: string;
        accountName: string;
        ownerName: string;
        ownerBirthDate: string;
        cpfCnpj: string;
        agency: string;
        account: string;
        accountDigit: string;
        bankAccountType: 'CONTA_CORRENTE' | 'CONTA_POUPANCA';
    };
}

interface AsaasPayment {
    id?: string;
    customer: string; // ID do cliente
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    value: number;
    dueDate: string; // YYYY-MM-DD
    description?: string;
    externalReference?: string; // ID do aluno no seu sistema
    installmentCount?: number;
    installmentValue?: number;
    split?: AsaasSplit[]; // Split de pagamento
}

interface AsaasSplit {
    walletId: string; // ID da subconta do condutor
    fixedValue?: number;
    percentualValue?: number;
    totalValue?: number;
}

interface AsaasSubscription {
    id?: string;
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    value: number;
    nextDueDate: string;
    cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description?: string;
    externalReference?: string;
    split?: AsaasSplit[]; // Split de pagamento
}

interface AsaasNegativation {
    payment: string; // ID da cobrança
    type: 'SERASA' | 'SPC';
    description?: string;
}

class AsaasService {
    private config: AsaasConfig;
    private baseUrl: string;

    constructor() {
        // Configuração inicial (será carregada das configurações do usuário)
        // Hardcoded para testes com APK
        this.config = {
            apiKey: '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJlYTg2MGU2LWZhOWItNGJkMi1hYjg1LTVhYmZiMmU0OGY0OTo6JGFhY2hfY2I3MGRhYTItZGJiOS00NzZiLWFkZWEtNGM1MjJjNWRlY2Y4',
            environment: 'sandbox',
            splitPercentage: 1 // 1% fica com você (Monitor Pro)
        };
        this.baseUrl = this.config.environment === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';
    }

    // Configura a API Key Master (sua)
    setApiKey(apiKey: string, environment: 'sandbox' | 'production' = 'production', splitPercentage: number = 1) {
        this.config.apiKey = apiKey;
        this.config.environment = environment;
        this.config.splitPercentage = splitPercentage;
        this.baseUrl = environment === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';
    }

    // Headers padrão para requisições
    private getHeaders() {
        return {
            'Content-Type': 'application/json',
            'access_token': this.config.apiKey
        };
    }

    // Calcula split de pagamento
    private calculateSplit(value: number, conductorWalletId: string): AsaasSplit[] {
        const yourPercentage = this.config.splitPercentage;
        const conductorPercentage = 100 - yourPercentage;

        return [
            {
                walletId: conductorWalletId,
                percentualValue: conductorPercentage
            }
            // Seu percentual fica automaticamente na conta master
        ];
    }

    // ========== SUBCONTAS (CONDUTORES) ==========

    // Criar subconta para condutor (Via Edge Function para evitar CORS e proteger API Key)
    async createAccount(account: AsaasAccount): Promise<any> {
        try {
            console.log('🚀 Iniciando criação de conta via Edge Function...');
            const { data, error } = await supabase.functions.invoke('create-asaas-account', {
                body: account
            });

            if (error) {
                console.error('❌ Erro na Edge Function:', error);
                throw error;
            }

            if (!data || !data.success) {
                throw new Error(data?.error || 'Erro desconhecido ao criar conta');
            }

            console.log('✅ Conta criada com sucesso via Edge Function!', data);

            // Retorna formato compatível com o frontend
            // O frontend espera 'id' para salvar como walletId. 
            // A função retorna 'walletId' e 'accountId'.
            return {
                id: data.walletId, // Mapeando walletId para id para compatibilidade
                accountId: data.accountId,
                ...data
            };
        } catch (error) {
            console.error('Erro ao criar subconta:', error);
            throw error;
        }
    }

    // Buscar subconta por CPF
    async getAccountByCpf(cpfCnpj: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/accounts?cpfCnpj=${cpfCnpj}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar subconta:', error);
            throw error;
        }
    }

    // Atualizar dados bancários da subconta
    async updateAccountBankInfo(accountId: string, bankAccount: any): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/accounts/${accountId}/bankAccount`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(bankAccount)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar dados bancários:', error);
            throw error;
        }
    }

    // ========== CLIENTES ==========

    // Criar cliente no Asaas (Via Proxy)
    async createCustomer(customer: AsaasCustomer): Promise<any> {
        const { data, error } = await supabase.functions.invoke('asaas-proxy', {
            body: { action: 'create-customer', ...customer }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data; // Retorna o objeto cliente direto
    }

    // Buscar cliente por CPF (Via Proxy)
    async getCustomerByCpf(cpfCnpj: string): Promise<any> {
        const { data, error } = await supabase.functions.invoke('asaas-proxy', {
            body: { action: 'get-customer', cpfCnpj }
        });
        if (error) throw error;
        return { data: data.data || [] }; // Mantém formato { data: [...] } pra compatibilidade
    }

    // ========== COBRANÇAS COM SPLIT ==========

    // Criar cobrança única com split (Via Proxy)
    async createPayment(payment: AsaasPayment, conductorWalletId?: string): Promise<any> {
        const { data, error } = await supabase.functions.invoke('asaas-proxy', {
            body: { action: 'create-payment', ...payment, walletId: conductorWalletId }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    }

    // Listar cobranças
    async listPayments(filters?: { customer?: string; status?: string }): Promise<any> {
        try {
            const params = new URLSearchParams(filters as any);
            const response = await fetch(`${this.baseUrl}/payments?${params}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao listar cobranças:', error);
            throw error;
        }
    }

    // Buscar cobrança específica
    async getPayment(paymentId: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar cobrança:', error);
            throw error;
        }
    }

    // ========== ASSINATURAS COM SPLIT (COBRANÇA RECORRENTE) ==========

    // Criar assinatura recorrente com split (Via Proxy)
    async createSubscription(subscription: AsaasSubscription, conductorWalletId?: string): Promise<any> {
        const { data, error } = await supabase.functions.invoke('asaas-proxy', {
            body: { action: 'create-subscription', ...subscription, walletId: conductorWalletId }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    }

    // Listar assinaturas
    async listSubscriptions(customerId?: string): Promise<any> {
        try {
            const params = customerId ? `?customer=${customerId}` : '';
            const response = await fetch(`${this.baseUrl}/subscriptions${params}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao listar assinaturas:', error);
            throw error;
        }
    }

    // Cancelar assinatura
    async cancelSubscription(subscriptionId: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao cancelar assinatura:', error);
            throw error;
        }
    }

    // ========== NEGATIVAÇÃO ==========

    // Criar negativação (Serasa/SPC)
    async createNegativation(negativation: AsaasNegativation): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/paymentDunnings`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(negativation)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao criar negativação:', error);
            throw error;
        }
    }

    // Simular negativação (testar antes de enviar)
    async simulateNegativation(paymentId: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/paymentDunnings/simulate`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ payment: paymentId })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao simular negativação:', error);
            throw error;
        }
    }

    // Listar negativações
    async listNegativations(): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/paymentDunnings`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao listar negativações:', error);
            throw error;
        }
    }

    // Cancelar negativação
    async cancelNegativation(negativationId: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/paymentDunnings/${negativationId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao cancelar negativação:', error);
            throw error;
        }
    }

    // ========== WEBHOOKS ==========

    // Configurar webhook para receber notificações
    async configureWebhook(url: string, events: string[]): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/webhooks`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    url,
                    email: '',
                    enabled: true,
                    interrupted: false,
                    authToken: crypto.randomUUID(),
                    events
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao configurar webhook:', error);
            throw error;
        }
    }
}

export const asaasService = new AsaasService();
export type { AsaasCustomer, AsaasPayment, AsaasSubscription, AsaasNegativation, AsaasAccount, AsaasSplit };
