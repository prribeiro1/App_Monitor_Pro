// Serviço de integração com Asaas API - Modelo Split de Pagamento
// Documentação: https://docs.asaas.com

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
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
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
        this.config = {
            apiKey: '', // Será configurado pelo admin (você)
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

    // Criar subconta para condutor
    async createAccount(account: AsaasAccount): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/accounts`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(account)
            });
            return await response.json();
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

    // Criar cliente no Asaas
    async createCustomer(customer: AsaasCustomer): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/customers`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(customer)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            throw error;
        }
    }

    // Buscar cliente por CPF
    async getCustomerByCpf(cpfCnpj: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/customers?cpfCnpj=${cpfCnpj}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            throw error;
        }
    }

    // ========== COBRANÇAS COM SPLIT ==========

    // Criar cobrança única com split
    async createPayment(payment: AsaasPayment, conductorWalletId?: string): Promise<any> {
        try {
            const paymentData = { ...payment };
            
            // Adiciona split se tiver walletId do condutor
            if (conductorWalletId) {
                paymentData.split = this.calculateSplit(payment.value, conductorWalletId);
            }

            const response = await fetch(`${this.baseUrl}/payments`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(paymentData)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao criar cobrança:', error);
            throw error;
        }
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

    // Criar assinatura recorrente com split
    async createSubscription(subscription: AsaasSubscription, conductorWalletId?: string): Promise<any> {
        try {
            const subscriptionData = { ...subscription };
            
            // Adiciona split se tiver walletId do condutor
            if (conductorWalletId) {
                subscriptionData.split = this.calculateSplit(subscription.value, conductorWalletId);
            }

            const response = await fetch(`${this.baseUrl}/subscriptions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(subscriptionData)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao criar assinatura:', error);
            throw error;
        }
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
