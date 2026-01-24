import React from 'react';
import { Icon, IconName } from './Icon';

// Lista de nomes femininos comuns no Brasil
const FEMALE_NAMES = new Set([
    'maria', 'ana', 'julia', 'leticia', 'gabriela', 'beatriz', 'isabela', 'isabella',
    'sofia', 'laura', 'valentina', 'helena', 'alice', 'manuela', 'livia', 'giovanna',
    'rafaela', 'camila', 'carolina', 'fernanda', 'juliana', 'mariana', 'patricia',
    'luciana', 'adriana', 'claudia', 'cristina', 'daniela', 'denise', 'eduarda',
    'eliane', 'fabiana', 'fatima', 'flavia', 'francisca', 'josefa', 'luana', 'luiza',
    'marta', 'natalia', 'paula', 'renata', 'roberta', 'rosa', 'sandra', 'silvia',
    'simone', 'sonia', 'suzana', 'tatiana', 'tereza', 'vanessa', 'vera', 'vitoria',
    'amanda', 'bruna', 'carla', 'elisa', 'yasmin', 'larissa', 'lara', 'isadora',
    'raquel', 'rebecca', 'bianca', 'clara', 'lorena', 'sarah', 'sara', 'milena',
    'stephanie', 'tais', 'thais', 'thaisa', 'priscila', 'aline', 'andreia', 'andrea',
    'angelica', 'antonia', 'barbara', 'cecilia', 'celia', 'daiane', 'diana', 'elaine',
    'emilia', 'erica', 'esther', 'eunice', 'evelyn', 'gisele', 'graziele', 'heloisa',
    'ingrid', 'iris', 'ivone', 'jennifer', 'jessica', 'joana', 'joseane', 'josiane',
    'joyce', 'karen', 'karina', 'katia', 'kelly', 'lais', 'leila', 'leia', 'leticia',
    'ligia', 'liliana', 'lorraine', 'lucia', 'luciara', 'luciene', 'madalena', 'magda',
    'marcela', 'marcia', 'margarete', 'marina', 'marlene', 'marta', 'miriam', 'monica',
    'nadia', 'neusa', 'nicole', 'pamela', 'pietra', 'raiane', 'rayane', 'regina',
    'rosana', 'rosangela', 'samara', 'samanta', 'shirley', 'solange', 'sueli', 'tayla',
    'vivian', 'viviane', 'yasmim', 'yara', 'zelia', 'adriele', 'agatha', 'alanis',
    'alessandra', 'alexia', 'alicia', 'amelie', 'analu', 'antonieta', 'ariane', 'ariela',
    'aurora', 'ayumi', 'betina', 'catarina', 'charlotte', 'chloe', 'cinthia', 'clarice',
    'clelia', 'dafne', 'debora', 'dolores', 'edna', 'elza', 'emma', 'ester', 'eva',
    'evelin', 'fabiana', 'fiona', 'francisca', 'geovana', 'gisela', 'hanna', 'helen',
    'iara', 'ilma', 'irene', 'isabel', 'ivana', 'jacqueline', 'janaina', 'jane',
    'jaqueline', 'jordana', 'jucelia', 'julieta', 'kamila', 'kiara', 'laiane', 'leia',
    'leonor', 'leticia', 'lilia', 'lina', 'lourdes', 'maisa', 'malu', 'margarida',
    'marilia', 'maya', 'melissa', 'micaela', 'micheli', 'mila', 'mirela', 'morgana',
    'nara', 'nayara', 'neide', 'nivia', 'noemi', 'olga', 'olivia', 'paloma', 'paola',
    'perla', 'pricila', 'rafaella', 'ramona', 'raissa', 'rute', 'sabrina', 'selena',
    'simara', 'soraia', 'stella', 'tamara', 'tamires', 'tania', 'tarsila', 'thaina',
    'valentina', 'valquiria', 'vania', 'veronica', 'wanda', 'zara', 'zilma'
]);

// Nomes masculinos que terminam em 'a' (exceções)
const MALE_EXCEPTIONS = new Set([
    'luca', 'joshua', 'josua', 'noah', 'nikola', 'andrea', 'sascha', 'mischa',
    'ezra', 'shiva', 'karma', 'yoga', 'buddha', 'arya', 'elijah', 'isaia',
    'costa', 'moura', 'vieira', 'oliveira', 'pereira', 'silva', 'souza'
]);

/**
 * Detecta o gênero baseado no primeiro nome
 */
const detectGender = (fullName: string): 'male' | 'female' | 'unknown' => {
    const firstName = fullName.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Verifica na lista de nomes femininos
    if (FEMALE_NAMES.has(firstName)) return 'female';

    // Verifica exceções masculinas
    if (MALE_EXCEPTIONS.has(firstName)) return 'male';

    // Heurística: nomes terminados em 'a' geralmente são femininos em português
    if (firstName.endsWith('a')) return 'female';

    // Por padrão, assume masculino (maioria em transporte escolar)
    return 'male';
};

interface AvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Avatar com ícone baseado no gênero detectado pelo nome
 */
export const GenderAvatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
    const gender = detectGender(name);

    // Cores baseadas no gênero
    const bgColor = gender === 'female'
        ? 'bg-pink-500'
        : 'bg-blue-500';

    const sizeClasses = {
        sm: 'w-8 h-8 min-w-[2rem]',
        md: 'w-10 h-10 min-w-[2.5rem]',
        lg: 'w-16 h-16 min-w-[4rem]'
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 32
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full ${bgColor} flex items-center justify-center text-white border-2 border-white/30 ${className}`}>
            <Icon name={gender === 'female' ? 'user' : 'user'} size={iconSizes[size]} />
        </div>
    );
};

/**
 * Avatar com iniciais (versão original, com cores por gênero)
 */
export const InitialsAvatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const gender = detectGender(name);

    // Cores baseadas no gênero
    const bgColor = gender === 'female'
        ? 'bg-pink-500'
        : 'bg-blue-500';

    const sizeClasses = {
        sm: 'w-8 h-8 min-w-[2rem] text-xs',
        md: 'w-10 h-10 min-w-[2.5rem] text-sm',
        lg: 'w-16 h-16 min-w-[4rem] text-xl'
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full ${bgColor} flex items-center justify-center text-white font-bold border-2 border-white/30 ${className}`}>
            {initials}
        </div>
    );
};

export { detectGender };
