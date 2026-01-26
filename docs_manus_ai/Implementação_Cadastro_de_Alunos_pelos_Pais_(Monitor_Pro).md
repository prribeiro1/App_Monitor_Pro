Implementação: Cadastro de Alunos pelos
Pais (Monitor Pro)
Esta funcionalidade permitirá que cada condutor gere um link exclusivo para enviar aos
pais via WhatsApp. O pai preenche os dados e o aluno aparece automaticamente no app do
condutor.
1. Como funcionará a arquitetura
Para que o sistema seja escalável e seguro para comercialização:
1. Link Único: Cada condutor terá um link baseado no seu user_id do Supabase.
• Exemplo: https://seu-app.web.app/#/cadastro-aluno/ID_DO_CONDUTOR
2. Segurança: O formulário público terá permissão apenas para INSERIR dados, nunca
para ler.
3. Vínculo: O campo user_id na tabela students será preenchido automaticamente com o
ID do condutor que enviou o link.
2. Novo Componente: PublicStudentRegister.tsx
Crie este arquivo na pasta pages/ . Ele é uma versão simplificada da sua tela de cadastro,
mas sem exigir login.
TypeScript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/auth';
import { Icon } from '../components/Icon';
export const PublicStudentRegister: React.FC = ( ) => {
const { driverId } = useParams<{ driverId: string }>();
const [loading, setLoading] = useState(false);
const [success, setSuccess] = useState(false);
const [error, setError] = useState('');
const [formData, setFormData] = useState({
name: '',
guardianName: '',
contact: '',
responsibleEmail: '',
school: '',
shift: 'morning',
address: '',
observation: ''
});
const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();
if (!driverId) return;
setLoading(true);
setError('');
try {
const { error: insertError } = await supabase.from('students').inse
user_id: driverId, // Vincula ao condutor dono do link
name: formData.name,
guardian_name: formData.guardianName,
contact: formData.contact,
responsible_email: formData.responsibleEmail,
school: formData.school,
shift: formData.shift,
address: formData.address,
observation: formData.observation,
active: true,
updated_at: new Date().toISOString()
});
if (insertError) throw insertError;
setSuccess(true);
} catch (err: any) {
console.error(err);
setError('Erro ao enviar cadastro. Verifique os dados e tente novame
} finally {
setLoading(false);
}
};
if (success) {
return (
<div className="min-h-screen bg-navy-900 flex items-center justify-c
<div className="bg-navy-800 p-8 rounded-3xl border border-green
<div className="w-20 h-20 bg-green-500/20 rounded-full flex
<Icon name="check" size={40} />
</div>
<h2 className="text-2xl font-bold text-white mb-4">Cadastro
<p className="text-gray-400">
Os dados de <strong>{formData.name}</strong> foram envia
</p>
</div>
</div>
);
}
return (
<div className="min-h-screen bg-navy-900 p-4 pb-12">
<div className="max-w-md mx-auto">
<div className="text-center mb-8 pt-8">
<div className="w-16 h-16 bg-primary-500 rounded-2xl flex i
<Icon name="face" size={32} className="text-white" />
</div>
<h1 className="text-2xl font-bold text-white">Ficha de Cadas
<p className="text-gray-400 text-sm mt-1">Transporte Escola
</div>
<form onSubmit={handleSubmit} className="space-y-4 bg-navy-800 p
{error && (
<div className="bg-red-500/10 border border-red-500/20
{error}
</div>
)}
<div>
<label className="block text-gray-400 text-xs font-bold
<input
type="text"
required
className="w-full bg-navy-900 text-white p-4 rounded
placeholder="Nome completo da criança"
value={formData.name}
onChange={e => setFormData({...formData, name: e.ta
/>
</div>
<div>
<label className="block text-gray-400 text-xs font-bold
<input
type="text"
required
className="w-full bg-navy-900 text-white p-4 rounded
placeholder="Quem responderá pelo aluno?"
value={formData.guardianName}
onChange={e => setFormData({...formData, guardianNam
/>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-gray-400 text-xs font-b
<input
type="tel"
required
className="w-full bg-navy-900 text-white p-4 rou
placeholder="(00) 00000-0000"
value={formData.contact}
onChange={e => setFormData({...formData, contac
/>
</div>
<div>
<label className="block text-gray-400 text-xs font-b
<select
className="w-full bg-navy-900 text-white p-4 rou
value={formData.shift}
onChange={e => setFormData({...formData, shift:
>
<option value="morning">Manhã</option>
<option value="afternoon">Tarde</option>
<option value="full">Integral</option>
</select>
</div>
</div>
<div>
<label className="block text-gray-400 text-xs font-bold
<input
type="text"
required
className="w-full bg-navy-900 text-white p-4 rounded
placeholder="Nome da escola"
value={formData.school}
onChange={e => setFormData({...formData, school: e.
/>
</div>
<div>
<label className="block text-gray-400 text-xs font-bold
<textarea
required
className="w-full bg-navy-900 text-white p-4 rounded
placeholder="Rua, número, bairro e ponto de referênc
value={formData.address}
onChange={e => setFormData({...formData, address: e
/>
</div>
<button
type="submit"
disabled={loading}
className="w-full bg-primary-600 hover:bg-primary-500 te
>
{loading ? 'Enviando...' : 'Finalizar Cadastro'}
</button>
</form>
</div>
</div>
);
};
3. Configuração de Rota no App.tsx
Você deve adicionar a rota pública fora da verificação de sessão no App.tsx :
TypeScript
// No App.tsx, dentro do <Routes> que aparece quando NÃO há sessão:
<Route path="/cadastro-aluno/:driverId" element={<PublicStudentRegister />} />
4. Segurança no Supabase (CRÍTICO)
Para que isso funcione, você precisa permitir que usuários não logados (anon) insiram
dados na tabela students . Execute este SQL no painel do Supabase:
SQL
-- 1. Habilitar inserção pública para a tabela students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir inserção pública de alunos"
ON students FOR INSERT
TO anon
WITH CHECK (true);
-- 2. Garantir que ninguém (anon) consiga ver os dados de outros
-- (Suas políticas atuais de SELECT já devem estar protegendo isso via auth.uid
5. Como o Condutor gera o link?
No perfil do condutor ou na tela de alunos, você pode adicionar um botão "Convidar Pais":
TypeScript
const shareLink = `https://seu-app.web.app/#/cadastro-aluno/${session.user.id}`
const handleShare = ( ) => {
const msg = encodeURIComponent(`Olá! Para agilizar o cadastro no transporte
window.open(`https://wa.me/?text=${msg}`, '_blank' );
};
Benefícios para o seu Negócio
• Profissionalismo: Seu cliente (o condutor) entrega uma experiência moderna para os
pais.
• Escalabilidade: O sistema suporta milhares de condutores simultâneos sem misturar
dados.
• Retenção: Uma vez que os alunos estão no banco de dados, o condutor dificilmente
sairá da sua plataforma.