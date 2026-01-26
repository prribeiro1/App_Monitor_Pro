/**
 * Proximity Monitor Service
 * 
 * Monitora a distância entre o condutor e os alunos
 * Envia notificações automáticas quando está próximo (500m)
 */

import { dbService } from './db';
import { Student, RouteEvent } from '../types';

interface ProximityAlert {
  studentId: string;
  distance: number;
  notified: boolean;
}

class ProximityMonitorService {
  private alerts: Map<string, ProximityAlert> = new Map();
  private readonly ALERT_DISTANCE = 500; // metros
  private onAlertCallback?: (student: Student, distance: number) => void;

  /**
   * Define o callback para alertas de proximidade
   */
  onAlert(callback: (student: Student, distance: number) => void) {
    this.onAlertCallback = callback;
  }

  /**
   * Calcula distância entre duas coordenadas (Haversine)
   * Retorna distância em metros
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Verifica proximidade e envia notificações automáticas
   */
  async checkProximity(
    driverLocation: { lat: number; lng: number },
    students: Student[],
    sessionId: string,
    userId: string
  ): Promise<void> {
    for (const student of students) {
      // Pular alunos sem GPS
      if (!student.latitude || !student.longitude) continue;

      const distance = this.calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        student.latitude,
        student.longitude
      );

      const alertKey = `${sessionId}_${student.id}`;
      const existingAlert = this.alerts.get(alertKey);

      // Se está dentro do raio de alerta e ainda não foi notificado
      if (distance <= this.ALERT_DISTANCE) {
        if (!existingAlert || !existingAlert.notified) {
          // Enviar notificação (Broadcast/Log)
          await this.sendProximityNotification(
            student,
            distance,
            sessionId,
            userId,
            driverLocation
          );

          // Chamar o callback da UI (Novo!)
          if (this.onAlertCallback) {
            this.onAlertCallback(student, distance);
          }

          // Marcar como notificado
          this.alerts.set(alertKey, {
            studentId: student.id,
            distance,
            notified: true,
          });
        }
      } else {
        // Se saiu do raio, resetar notificação (para poder notificar novamente)
        if (existingAlert && distance > this.ALERT_DISTANCE * 2) {
          this.alerts.delete(alertKey);
        }
      }
    }
  }


  /**
   * Envia notificação de proximidade
   */
  private async sendProximityNotification(
    student: Student,
    distance: number,
    sessionId: string,
    userId: string,
    location: { lat: number; lng: number }
  ): Promise<void> {
    try {
      // Registrar evento no banco
      const event: RouteEvent = {
        id: crypto.randomUUID(),
        sessionId,
        studentId: student.id,
        userId: userId,
        eventType: 'notification_sent',
        timestamp: new Date().toISOString(),
        latitude: location.lat,
        longitude: location.lng,
        notes: `Notificação automática: condutor a ${Math.round(distance)}m`,
        createdAt: new Date().toISOString(),
      };

      await dbService.saveRouteEvent(event);

      console.log(
        `✅ Notificação enviada para ${student.name} (${Math.round(distance)}m)`
      );
    } catch (error) {
      console.error('Erro ao enviar notificação de proximidade:', error);
    }
  }

  /**
   * Limpa alertas de uma sessão
   */
  clearSession(sessionId: string): void {
    const keysToDelete: string[] = [];
    this.alerts.forEach((_, key) => {
      if (key.startsWith(sessionId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.alerts.delete(key));
  }

  /**
   * Formata distância para exibição
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Calcula tempo estimado de chegada (baseado em velocidade média de 30km/h)
   */
  estimateArrivalTime(meters: number): string {
    const speedKmH = 30; // Velocidade média urbana
    const speedMS = (speedKmH * 1000) / 3600; // Converter para m/s
    const seconds = meters / speedMS;

    if (seconds < 60) {
      return 'menos de 1 minuto';
    }

    const minutes = Math.round(seconds / 60);
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
}

export const proximityMonitorService = new ProximityMonitorService();
