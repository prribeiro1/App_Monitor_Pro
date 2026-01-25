/**
 * Serviço de Otimização de Rotas
 * 
 * Algoritmo: Nearest Neighbor (Vizinho Mais Próximo)
 * Complexidade: O(n²) - Adequado para até ~50 pontos
 */

import { Student } from '../types';

interface Location {
  lat: number;
  lng: number;
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * Retorna a distância em metros
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
    Math.cos(toRadians(point2.lat)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Otimiza a ordem dos alunos usando o algoritmo Nearest Neighbor
 * 
 * @param students - Lista de alunos com coordenadas
 * @param startLocation - Localização inicial (opcional, usa primeiro aluno se não fornecido)
 * @returns Lista de alunos ordenada pela rota otimizada
 */
export function optimizeRoute(
  students: Student[],
  startLocation?: Location
): Student[] {
  // Filtrar apenas alunos com coordenadas válidas
  const studentsWithCoords = students.filter(
    s => s.latitude != null && s.longitude != null
  );

  if (studentsWithCoords.length === 0) {
    console.warn('Nenhum aluno com coordenadas para otimizar');
    return students;
  }

  if (studentsWithCoords.length === 1) {
    return studentsWithCoords;
  }

  // Alunos sem coordenadas vão para o final
  const studentsWithoutCoords = students.filter(
    s => s.latitude == null || s.longitude == null
  );

  // Ponto de partida
  let currentLocation: Location = startLocation || {
    lat: studentsWithCoords[0].latitude!,
    lng: studentsWithCoords[0].longitude!
  };

  const optimized: Student[] = [];
  const remaining = [...studentsWithCoords];

  // Algoritmo Nearest Neighbor
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    // Encontra o aluno mais próximo da posição atual
    for (let i = 0; i < remaining.length; i++) {
      const student = remaining[i];
      const distance = calculateDistance(currentLocation, {
        lat: student.latitude!,
        lng: student.longitude!
      });

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    // Adiciona o aluno mais próximo à rota otimizada
    const nearestStudent = remaining[nearestIndex];
    optimized.push(nearestStudent);

    // Atualiza a posição atual
    currentLocation = {
      lat: nearestStudent.latitude!,
      lng: nearestStudent.longitude!
    };

    // Remove da lista de pendentes
    remaining.splice(nearestIndex, 1);
  }

  // Adiciona alunos sem coordenadas no final
  return [...optimized, ...studentsWithoutCoords];
}

/**
 * Calcula o tempo estimado de chegada para cada aluno
 * 
 * @param students - Lista de alunos ordenada
 * @param startTime - Horário de início (HH:MM)
 * @param avgSpeedKmh - Velocidade média em km/h (padrão: 30 km/h)
 * @param stopTimeMinutes - Tempo de parada em cada ponto em minutos (padrão: 2 min)
 * @returns Lista de alunos com horários estimados
 */
export function calculateEstimatedTimes(
  students: Student[],
  startTime: string,
  avgSpeedKmh: number = 30,
  stopTimeMinutes: number = 2
): Student[] {
  if (students.length === 0) return [];

  const [startHour, startMinute] = startTime.split(':').map(Number);
  let currentMinutes = startHour * 60 + startMinute;

  const result: Student[] = [];
  let previousLocation: Location | null = null;

  for (const student of students) {
    if (student.latitude != null && student.longitude != null) {
      // Calcula tempo de viagem desde o ponto anterior
      if (previousLocation) {
        const distanceMeters = calculateDistance(previousLocation, {
          lat: student.latitude,
          lng: student.longitude
        });
        const distanceKm = distanceMeters / 1000;
        const travelTimeMinutes = (distanceKm / avgSpeedKmh) * 60;
        currentMinutes += travelTimeMinutes;
      }

      // Adiciona tempo de parada
      currentMinutes += stopTimeMinutes;

      // Formata horário estimado
      const estimatedHour = Math.floor(currentMinutes / 60) % 24;
      const estimatedMinute = Math.floor(currentMinutes % 60);
      const estimatedTime = `${String(estimatedHour).padStart(2, '0')}:${String(estimatedMinute).padStart(2, '0')}`;

      result.push({
        ...student,
        estimatedPickupTime: estimatedTime
      });

      previousLocation = {
        lat: student.latitude,
        lng: student.longitude
      };
    } else {
      // Aluno sem coordenadas, não tem horário estimado
      result.push(student);
    }
  }

  return result;
}

/**
 * Formata a distância para exibição
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calcula a distância total da rota
 */
export function calculateTotalDistance(students: Student[]): number {
  let totalDistance = 0;
  let previousLocation: Location | null = null;

  for (const student of students) {
    if (student.latitude != null && student.longitude != null) {
      const currentLocation = {
        lat: student.latitude,
        lng: student.longitude
      };

      if (previousLocation) {
        totalDistance += calculateDistance(previousLocation, currentLocation);
      }

      previousLocation = currentLocation;
    }
  }

  return totalDistance;
}

export const routeOptimizationService = {
  optimizeRoute,
  calculateEstimatedTimes,
  calculateDistance,
  formatDistance,
  calculateTotalDistance
};
