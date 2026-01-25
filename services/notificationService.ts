/**
 * Serviço de Notificações
 * 
 * Envia avisos para os responsáveis via WhatsApp
 */

import { Student } from '../types';
import { formatDistance } from './routeOptimizationService';

interface NotificationOptions {
  studentName: string;
  responsiblePhone: string;
  distance?: number;
  estimatedTime?: string;
}

/**
 * Limpa o número de telefone removendo caracteres especiais
 */
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Abre o WhatsApp com uma mensagem pré-formatada
 */
function openWhatsApp(phone: string, message: string): void {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/55${cleanPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
}

/**
 * Envia notificação de "Estou chegando"
 */
export function notifyArriving(options: NotificationOptions): void {
  const { studentName, responsiblePhone, distance, estimatedTime } = options;

  let message = `Olá! 🚐\n\nEstou chegando para buscar ${studentName}`;

  if (distance) {
    message += ` (aprox. ${formatDistance(distance)})`;
  }

  if (estimatedTime) {
    message += `.\nPrevisão de chegada: ${estimatedTime}`;
  }

  message += '.\n\nPor favor, esteja pronto(a)!';

  openWhatsApp(responsiblePhone, message);
}

/**
 * Envia notificação de "Embarque confirmado"
 */
export function notifyPickedUp(options: NotificationOptions): void {
  const { studentName, responsiblePhone } = options;

  const message = `✅ ${studentName} embarcou com segurança!\n\nEstamos a caminho da escola.`;

  openWhatsApp(responsiblePhone, message);
}

/**
 * Envia notificação de "Desembarque confirmado"
 */
export function notifyDroppedOff(options: NotificationOptions): void {
  const { studentName, responsiblePhone } = options;

  const message = `✅ ${studentName} chegou na escola com segurança!\n\nTenha um ótimo dia!`;

  openWhatsApp(responsiblePhone, message);
}

/**
 * Envia notificação de "Rota iniciada"
 */
export function notifyRouteStarted(students: Student[], routeName: string): void {
  const studentsWithPhone = students.filter(s => s.responsiblePhone);

  if (studentsWithPhone.length === 0) {
    console.warn('Nenhum aluno com telefone cadastrado');
    return;
  }

  studentsWithPhone.forEach((student, index) => {
    const message = `🚐 Rota ${routeName} iniciada!\n\n${student.name} está na lista de hoje.\n\nAcompanhe em tempo real!`;

    // Delay entre mensagens para não sobrecarregar
    setTimeout(() => {
      openWhatsApp(student.responsiblePhone!, message);
    }, index * 500);
  });
}

/**
 * Envia notificação de "Rota concluída"
 */
export function notifyRouteCompleted(students: Student[], routeName: string): void {
  const studentsWithPhone = students.filter(s => s.responsiblePhone);

  if (studentsWithPhone.length === 0) {
    console.warn('Nenhum aluno com telefone cadastrado');
    return;
  }

  studentsWithPhone.forEach((student, index) => {
    const message = `✅ Rota ${routeName} concluída!\n\nTodos os alunos foram entregues com segurança.\n\nObrigado pela confiança!`;

    // Delay entre mensagens
    setTimeout(() => {
      openWhatsApp(student.responsiblePhone!, message);
    }, index * 500);
  });
}

/**
 * Envia notificação personalizada
 */
export function sendCustomNotification(
  responsiblePhone: string,
  message: string
): void {
  openWhatsApp(responsiblePhone, message);
}

/**
 * Envia notificação para múltiplos responsáveis
 */
export function notifyMultiple(
  students: Student[],
  messageTemplate: (studentName: string) => string
): void {
  const studentsWithPhone = students.filter(s => s.responsiblePhone);

  if (studentsWithPhone.length === 0) {
    console.warn('Nenhum aluno com telefone cadastrado');
    return;
  }

  if (studentsWithPhone.length > 1) {
    const names = studentsWithPhone.map(s => s.name).join(', ');
    const confirmed = confirm(
      `Avisar os responsáveis de: ${names}?\n\n(${studentsWithPhone.length} mensagens serão enviadas)`
    );

    if (!confirmed) return;
  }

  studentsWithPhone.forEach((student, index) => {
    const message = messageTemplate(student.name);

    // Delay entre mensagens
    setTimeout(() => {
      openWhatsApp(student.responsiblePhone!, message);
    }, index * 500);
  });
}

export const notificationService = {
  notifyArriving,
  notifyPickedUp,
  notifyDroppedOff,
  notifyRouteStarted,
  notifyRouteCompleted,
  sendCustomNotification,
  notifyMultiple
};
