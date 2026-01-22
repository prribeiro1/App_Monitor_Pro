// Serviço de integração com Asaas API
// Documentação: https://docs.asaas.com

interface AsaasConfig {
    apiKey: string;
    environment: 'sandbox' | 'production';
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
            apiKey: '', // Será configurado pelo usuário
            environment: 'sandbox'
        };
        this.baseUrl = this.config.environment === 'production' 
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';
    }

    // Configura a API Key
    setApiKey(apiKey: string, environment: 'sandbox' | 'production' = 'production') {
        this.config.apiKey = apiKey;
        this.config.environment = environment;
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

    // ========== COBRANÇAS ==========

    // Criar cobrança única
    async createPayment(payment: AsaasPayment): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/payments`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payment)
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

    // ========== ASSINATURAS (COBRANÇA RECORRENTE) ==========

    // Criar assinatura recorrente
    async createSubscription(subscription: AsaasSubscription): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/subscriptions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(subscription)
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
export type { AsaasCustomer, AsaasPayment, AsaasSubscription, AsaasNegativation };
