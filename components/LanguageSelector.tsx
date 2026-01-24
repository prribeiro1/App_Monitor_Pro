import React, { useState } from 'react';
import { useI18n, Language, languageLabels } from '../i18n';
import { Icon } from './Icon';

interface LanguageSelectorProps {
    className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
    const { language, setLanguage, t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);

    const languages: Language[] = ['pt-BR', 'es'];

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-navy-900 border border-navy-700 text-white p-3 rounded-lg hover:bg-navy-800 transition w-full"
            >
                <span className="text-xl">{language === 'pt-BR' ? '🇧🇷' : '🇪🇸'}</span>
                <span className="flex-1 text-left">{languageLabels[language]}</span>
                <Icon name="chevron-down" size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-navy-800 border border-navy-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {languages.map(lang => (
                        <button
                            key={lang}
                            onClick={() => {
                                setLanguage(lang);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 p-3 text-left hover:bg-navy-700 transition ${language === lang ? 'bg-primary-600/20 text-primary-400' : 'text-white'
                                }`}
                        >
                            <span className="text-xl">{lang === 'pt-BR' ? '🇧🇷' : '🇪🇸'}</span>
                            <span>{languageLabels[lang]}</span>
                            {language === lang && (
                                <Icon name="check" size={16} className="ml-auto text-primary-400" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
