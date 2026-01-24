import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { pt_BR, TranslationKeys } from './pt-BR';
import { es } from './es';

// Tipos suportados
export type Language = 'pt-BR' | 'es';

// Mapa de traduções
const translations: Record<Language, Record<TranslationKeys, string>> = {
    'pt-BR': pt_BR,
    'es': es
};

// Labels para exibição
export const languageLabels: Record<Language, string> = {
    'pt-BR': '🇧🇷 Português',
    'es': '🇪🇸 Español'
};

// Chave no localStorage
const LANGUAGE_KEY = 'app_language';

// Detecta o idioma do navegador
const detectBrowserLanguage = (): Language => {
    const browserLang = navigator.language || (navigator as any).userLanguage || 'pt-BR';

    // Verifica se é espanhol
    if (browserLang.startsWith('es')) {
        return 'es';
    }

    // Por padrão, português
    return 'pt-BR';
};

// Contexto
interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Provider
interface I18nProviderProps {
    children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        // Tenta carregar do localStorage
        const saved = localStorage.getItem(LANGUAGE_KEY) as Language;
        if (saved && translations[saved]) {
            return saved;
        }
        // Senão, detecta do navegador
        return detectBrowserLanguage();
    });

    // Salva no localStorage quando muda
    useEffect(() => {
        localStorage.setItem(LANGUAGE_KEY, language);
    }, [language]);

    const setLanguage = (lang: Language) => {
        if (translations[lang]) {
            setLanguageState(lang);
        }
    };

    /**
     * Função de tradução
     * @param key - Chave da tradução
     * @param params - Parâmetros dinâmicos (ex: {count: 5})
     */
    const t = (key: TranslationKeys, params?: Record<string, string | number>): string => {
        let text = translations[language][key] || translations['pt-BR'][key] || key;

        // Substitui parâmetros dinâmicos
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
            });
        }

        return text;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
};

// Hook para usar o i18n
export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};

// HOC para componentes de classe (se necessário)
export const withI18n = <P extends object>(
    Component: React.ComponentType<P & I18nContextType>
): React.FC<P> => {
    return (props: P) => {
        const i18n = useI18n();
        return <Component {...props} {...i18n} />;
    };
};

// Exporta tudo
export { pt_BR, es };
export type { TranslationKeys };
